import os
import random
import time
import urlparse
import logging

from slugify import slugify

from cloudsync import CloudSync

from motherbrain.api_server.handlers import UrlistDBMixin
from motherbrain.api_server.auth import OAuthException

from motherbrain.models import profile as profile_model
from motherbrain.models.profile import default_profile_image

from motherbrain.helpers.facebook import fix_profile_img

from motherbrain.com.messages import MBMessage

from motherbrain.models.profile import new_token, token_is_valid, write_oauth


class OAuthAccount(UrlistDBMixin):
    oauth_provider = None

    # When one of this field is missing, try to merge from oauth data
    fields_to_import = ['location', 'short_bio', 'screen_name', 'email',
                        'profile_image']

    def __init__(self, settings, oauth_data, *args, **kwargs):
        self.settings = settings
        self.user_options = self.settings.get('options')

        self.oauth_user_id = None
        self.oauth_token = None
        self.oauth_data = oauth_data

        self.set_secure_cookies = self.set_cookies

        super(OAuthAccount, self).__init__(*args, **kwargs)

    def _clean_username(self, raw_username):
        return slugify(unicode(raw_username)).replace('-', '')

    def account_exist(self, oauth_user_id=None, oauth_provider=None, email=None):
        if email:
            user_data = self.db.users.find_one({'email': email})
            if user_data:
                return user_data

        oauth_user_id = oauth_user_id or self.oauth_user_id
        oauth_provider = oauth_provider or self.oauth_provider

        field = '{}_id'.format(oauth_provider)

        return self.db.users.find_one({field: oauth_user_id})

    def make_tmp_urlist_username(self, raw_username):
        username = self._clean_username(raw_username)

        return profile_model.make_unique_username(username, self.db)

    def set_cookies(self, handler):
        key = '{}_id'.format(self.oauth_provider)

        user = self.db.users.find_one({key: self.oauth_user_id})
        user_id = str(user.get('_id'))

        token = user.get('urlist_last_token')

        if not token_is_valid(token):
            token = new_token()
            write_oauth(self.db, user_id, token)

        oauth_data = {'oauth_token': token,
                      'oauth_user_id': user_id,
                      'oauth_provider': 'urlist'}

        set_cookie = lambda k, v: handler.set_secure_cookie(k, v)

        [set_cookie(k, v) for k, v in oauth_data.iteritems()]

    def _dump_oauth_data(self):
        user_id_key = '{}_id'.format(self.oauth_provider)

        specs = {user_id_key: self.oauth_user_id,
                 'provider': self.oauth_provider}

        data = dict(self.oauth_data, **specs)

        self.db.oauth_dump.update(specs, data, upsert=True)

    def connect(self, handler, current_user):
        logging.info("OAUTH Connect")

        self._dump_oauth_data()

        target_oauth_user_id = self.oauth_user_id
        target_oauth_provider = self.oauth_provider

        current_oauth_user_id = handler.get_secure_cookie('oauth_user_id')
        current_oauth_provider = handler.get_secure_cookie('oauth_provider')

        email = self.oauth_data.get('email')

        previous_account = self.account_exist(target_oauth_user_id,
                                              target_oauth_provider,
                                              None)

        if not previous_account:
            user_query = self.update(current_oauth_user_id,
                                     current_oauth_provider)

            return self.db.users.find_one(user_query)

        previous_account_oid = previous_account.get('_id')
        current_account_oid = current_user.get('_id')

        if previous_account_oid == current_account_oid:
            raise OAuthException('AlreadyConnected')
        else:
            raise OAuthException('ConnectedToAnotherAccount')

    def login(self, handler):
        anonymous_user = handler.current_user

        is_new = False

        self._dump_oauth_data()

        oauth_user_id =  handler.get_secure_cookie('oauth_user_id')
        oauth_provider = handler.get_secure_cookie('oauth_provider')

        email = self.oauth_data.get('email')

        handler.clear_all_cookies()

        if not self.account_exist(oauth_user_id, oauth_provider, email):
            origin = {'origin_id': str(anonymous_user.get('_id')),
                      'origin_creation_time': anonymous_user.get('creation_time')}

            user_query = self.new(origin=origin)

            is_new = True
        else:
            user_query = self.update(oauth_user_id, oauth_provider)

        if not user_query:
            return None

        user = self.db.users.find_one(user_query, safe=True)

        if not user:
            return None

        self.set_secure_cookies(handler)

        if is_new:
            user_id = str(user.get('_id'))

            msg = MBMessage(None,
                            'welcome',
                            {'user_id': user_id},
                            {'registered_with': oauth_provider},
                            {'current_user_id': user_id})

            handler.dispatch_and_forget(msg)

        return user

    def update(self, oauth_user_id=None, oauth_provider=None):
        oauth_user_id = oauth_user_id or self.oauth_user_id
        oauth_provider = oauth_provider or self.oauth_provider

        id_key = '{}_id'.format(oauth_provider)

        user_data = self._user_data()
        email = self.oauth_data.get('email')

        if oauth_user_id and oauth_provider:
            query = {id_key: oauth_user_id}
            logging.info('APISRV::ACCOUNT --- Update/Connect --- {}'.format(oauth_user_id))
        else:
            query = {'email': email}
            logging.info('APISRV::ACCOUNT --- Update')

        self.db.users.update(query, {'$set': user_data}, safe=True)

        # Fill missing fields from oauth data
        user = self.db.users.find_one({id_key: oauth_user_id})

        if not user:
            raise OAuthException('InternalError')

        imported_fields = self.import_fields(user_data)

        is_default_avatar = lambda k: all([k == 'profile_image',
                                           user.get(k).find('le_images/default.png') != -1])

        for k in imported_fields.keys():
            if user.get(k) and not is_default_avatar(k):
                del imported_fields[k]

        if len(imported_fields):
            self.db.users.update(query, {'$set': imported_fields}, safe=True)

        return query

    def new(self, origin=None):
        logging.info('APISRV::ACCOUNT --- New')
        user_data = self._user_data()
        oauth_provider = self.oauth_provider

        id_key = '{}_id'.format(oauth_provider)

        screen_name = user_data.get('{}_screen_name'.format(oauth_provider))
        urlist_username = self.make_tmp_urlist_username(screen_name)

        user_data['username'] = urlist_username

        imported_fields = self.import_fields(user_data)

        data = dict(imported_fields, **user_data)
        origin = origin or {}
        origin['oauth_provider'] = oauth_provider

        extra_data = dict(origin,
                          **{'profile_image': data.get('facebook_profile_img', None)})

        defdata = profile_model.make_defaults(
                self.user_options.get('server', 'static_url'),
                **extra_data)

        new_data = dict(defdata, **data)

        self.db.users.insert(new_data)

        user_id = {id_key: user_data.get(id_key)}

        if hasattr(self, 'after_signup'):
            logging.info("After Signup")
            self.after_signup(new_data)

        return user_id

    def import_fields(self, data):
        """Extract optional fields from oauth data.

        Example:
            facebook_location -> location
        """

        _make_key = lambda k: '_'.join(k.split('_')[1:])

        new_data = {_make_key(k):v for k, v in data.iteritems()
                    if _make_key(k) in self.fields_to_import and \
                       not k.find('_') == -1}

        if data.get('facebook_profile_img'):
            new_data['profile_image'] = data.get('facebook_profile_img')
            logging.info(new_data)

        return new_data


class FacebookOAuthAccount(OAuthAccount):
    oauth_provider = 'facebook'

    def __init__(self, *args, **kwargs):
        super(FacebookOAuthAccount, self).__init__(*args, **kwargs)

        self.oauth_user_id = str(self.oauth_data.get('id'))
        self.oauth_token = str(self.oauth_data.get('access_token'))

    def _user_data(self):
        oauth_data = self.oauth_data
        picture_data = oauth_data.get('picture', {}).get('data')
        location_data = oauth_data.get('location', {})

        return {'facebook_id': oauth_data.get('id'),
                'facebook_screen_name': oauth_data.get('name'),
                'facebook_username': oauth_data.get('username') or oauth_data.get('id'),
                'facebook_email': oauth_data.get('email'),
                'facebook_profile_img': fix_profile_img(picture_data.get('url')),
                'facebook_location': location_data.get('name'),
                'facebook_last_token': oauth_data.get('access_token')}

    def after_signup(self, user_data):
        user_oid = user_data.get('_id')
        user_id = str(user_oid)

        fileid = "{}.jpg".format(user_id)

        media_path = self.user_options.get('server', 'media_path')
        profile_image_path = os.path.join(media_path, 'custom-profile-images', fileid)

        def update_profile_image(resp):
            logging.info("Updating profile image --- {}".format(profile_image_path))

            if not resp or resp.code >= 400:
                self.db.users.update({'_id': user_oid},
                                    {'$set': {'profile_image': default_profile_image},
                                     '$addToSet': {'progress': 'profile_image'}})

                return default_profile_image

            fileurl = resp.body

            self.db.users.update({'_id': user_oid},
                                 {'$set': {'profile_image': fileurl},
                                  '$pull': {'progress': 'profile_image'}})

            return


        fb_url = "https://graph.facebook.com/{}/picture?width=200&height=200".format(user_data.get('facebook_id'))

        cloud = CloudSync(callback=update_profile_image)
        cloud.put('custom-profile-images', fb_url, 'avatar.sh', fileid)

        return



class TwitterOAuthAccount(OAuthAccount):
    oauth_provider = 'twitter'

    def __init__(self, *args, **kwargs):
        super(TwitterOAuthAccount, self).__init__(*args, **kwargs)

        twitter_auth_data = self.oauth_data.get('access_token')

        self.oauth_user_id = twitter_auth_data.get('user_id')
        self.oauth_token = twitter_auth_data.get('key')
        self.twitter_data = twitter_auth_data

    def new(self, *args, **kwargs):
        raise OAuthException("Cannot Signup with Twitter")

    def _user_data(self):
        oauth_data = self.oauth_data

        return {'twitter_id': self.oauth_user_id,
                'twitter_screen_name': oauth_data.get('name'),
                'twitter_username': oauth_data.get('username'),
                'twitter_profile_img': oauth_data.get('profile_image_url'),
                'twitter_location': oauth_data.get('location'),
                'twitter_key': self.twitter_data.get('key'),
                'twitter_secret': self.twitter_data.get('secret'),
                'twitter_last_token': self.oauth_token}


class GoogleOAuthAccount(OAuthAccount):
    oauth_provider = 'google'

    def __init__(self, *args, **kwargs):
        super(GoogleOAuthAccount, self).__init__(*args, **kwargs)

        oauth_data = self.oauth_data

        oauth_token = self._oauth_user_id(oauth_data.get('claimed_id'))

        self.oauth_user_id = oauth_data.get('email')
        self.oauth_token = oauth_token

    def _oauth_user_id(self, claimed_id_url):
        parse = urlparse.urlparse(claimed_id_url)

        return unicode(parse.query[3:])

    def _user_data(self):
        oauth_data = self.oauth_data

        return {'google_id': self.oauth_user_id,
                'google_email': oauth_data.get('email'),
                'google_username': oauth_data.get('name'),
                'google_screen_name': oauth_data.get('name'),
                'google_last_token': self.oauth_token}
