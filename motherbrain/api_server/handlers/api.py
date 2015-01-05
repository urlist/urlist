import os
import sys
import json
import hashlib
import logging
import uuid
import base64
import PIL
import datetime
import random
import StringIO

from io import BytesIO
from random import choice

from PIL import Image

from slugify import slugify

from motherbrain.api_server.go import GoHandler

from tornado import gen
from tornado.web import authenticated, asynchronous, HTTPError

from tornado.httputil import parse_body_arguments
from tornado.httpclient import AsyncHTTPClient

from motherbrain.api_server.handlers import UrlistHandler, \
                                            smart_user_id, \
                                            _smart_user_id, \
                                            _json

from motherbrain.com.messages import MBMessage, MBMessageMixin

from motherbrain.models.profile import default_profile_image

from bson.objectid import ObjectId

FAKE_UA = """Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13+ (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2"""

CATEGORIES = ['technology', 'education', 'science-education',
              'information-media', 'business', 'activism',
              'cooking', 'society-politics', 'passions-hobbies',
              'culture-arts', 'controversial', 'places']

class UrlistContextMixin(object):
    def context(self, new_context={}):
        c = {'visit_collection_name': 'visit',
             'current_user_id': str(self.current_user.get('_id')),
             'base_url': self.user_options.get('server', 'base_url')}

        return dict(c, **new_context)


class WelcomeHandler(UrlistHandler):
    def get(self):
        self.write('Knock, Knock...')


class ServerTimeHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    def get(self):
        now = datetime.datetime.now().isoformat()

        self.write(json.dumps({'now': now}))
        self.finish()


class ListHandler(UrlistHandler, UrlistContextMixin):
    def compute_etag(self):
        return None

    @asynchronous
    @authenticated
    @gen.engine
    def get(self, list_id=None):
        api_msg = MBMessage(None, 'fetch_list',
                            {'list_hash': list_id}, {}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.guess_ctype()

        self.write(resp.payload)
        self.finish()

    def post(self, list_id=None):
        api_msg = MBMessage(None, 'fetch_list',
                            {'list_hash': list_id},
                            {'url': self.get_argument('url')},
                            self.context())

        resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class MBPingHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @gen.engine
    def get(self):
        api_msg = MBMessage(None, 'ping',
                            {}, {}, self.context())

        resp = yield self.dispatch(api_msg)

        self.set_header('Content-Type', 'application/json')
        self.write(resp.payload)
        self.finish()

class DiscoveryHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self):
        api_msg = MBMessage(None, 'fetch_discovery',
                            {}, {}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.guess_ctype()

        self.write(resp.payload)
        self.finish()


class LandingHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self, key=""):
        api_msg = MBMessage(None, 'fetch_landing',
                  {}, {'key': key}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.guess_ctype()

        self.write(resp.payload)
        self.finish()


class FetchNotifications(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self):
        self.guess_ctype()

        if self.is_anonymous():
            self.write(json.dumps({'notifications': []}))
            self.finish()

            return

        api_msg = MBMessage(None, 'fetch_contrib_notifications',
                            {}, {}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class FetchListByCategoryHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self, categories=None):
        api_msg = MBMessage(None, 'fetch_list_by_categories',
                            {'categories': categories}, {}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.guess_ctype()
        self.write(resp.payload)
        self.finish()


class UserHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @smart_user_id
    @gen.engine
    def get(self, user_id=None):
        api_msg = MBMessage(None, 'fetch_user',
                            {'user_id': user_id}, {}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class ProfileHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @smart_user_id
    @gen.engine
    def get(self, user_id=None):
        api_msg = MBMessage(None, 'fetch_user_profile',
                            {'user_id': user_id}, {}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.guess_ctype()

        self.write(resp.payload)
        self.finish()


class FocusOnHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self, edition=None):
        ctx = self.context()

        api_msg = MBMessage(None, 'fetch_focuson',
                       {}, {'edition': edition or ""}, ctx)

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class TopListsHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self, edition=None):
        ctx = self.context()

        api_msg = MBMessage(None, 'fetch_toplists',
                       {}, {'edition': edition or ""}, ctx)

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class FollowMoreHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self, edition=None):
        ctx = self.context()

        api_msg = MBMessage(None, 'fetch_followmore',
                       {}, {}, ctx)

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class TopUsersHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self, category=None):
        ctx = self.context()

        api_msg = MBMessage(None, 'fetch_topusers',
                       {'category': category or choice(CATEGORIES)}, {}, ctx)

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class PopularListHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self):
        ctx = self.context()

        api_msg = MBMessage(None, 'fetch_popular', {}, {}, ctx)

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class UserNetworkHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self, user_id, mode=None):
        user_id = _smart_user_id(self, user_id)

        ctx = self.context()

        if not user_id:
            user_id = ctx.get('current_user_id')

        if mode not in ["list", "url", "lists", "urls"]:
            mode = "list"

        api_msg = MBMessage(None, 'fetch_user_network',
                    {'user_id': user_id, 'mode': mode}, {}, ctx)

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class SearchHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self):
        query = self.get_argument('q') or self.get_argument('query')
        scope = self.get_argument('scope', 'me')

        if scope == 'me':
            api_msg = MBMessage(None, 'search_url',
                                {'query': query}, {}, self.context())
        else:
            api_msg = MBMessage(None, 'beta_search_url',
                                {'query': query},
                                {'scope': scope}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class BetaSearchHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self):
        query = self.get_argument('q') or self.get_argument('query')
        scope = self.get_argument('scope', 'me')

        api_msg = MBMessage(None, 'beta_search_url',
                            {'query': query},
                            {'scope': scope}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()

    @asynchronous
    @authenticated
    @gen.engine
    def post(self):
        query = self.get_argument('q') or self.get_argument('query')

        api_msg = MBMessage(None, 'beta_search_url',
                            {'query': query}, {}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class ContentProxyHandler(UrlistHandler):
    @asynchronous
    @gen.engine
    def get(self):
        try:
            url = self.get_arguments('url')[0]
        except IndexError:
            self.write("")
            return

        client = AsyncHTTPClient()

        req = yield gen.Task(client.fetch, url, user_agent=FAKE_UA)

        self.set_header("Content-Type", req.headers.get('Content-Type'))
        self.write(req.body)

        self.finish()

class DataLiberation(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self):
        import os

        api_msg = MBMessage(None, 'export_data', {}, {}, self.context())

        resp = yield self.dispatch(api_msg)

        filename = resp.payload.get('filename')

        if not filename:
            raise HTTPError(500)

        datadir = self.user_options.get('motherbrain', 'datadir')
        path = os.path.join(datadir, filename)

        self.set_header('Content-Type', 'application/zip')
        self.set_header('Content-Disposition', 'attachment; filename={}'
                                               ''.format(filename))

        with open(path, 'r') as f:
            self.write(f.read())

        self.finish()


class ProfileImageHandler(UrlistHandler, UrlistContextMixin):
    @authenticated
    @smart_user_id
    def get(self, user_id):
        user_data = self.db.users.find_one({'_id': ObjectId(user_id)})

        profile_image = user_data.get('custom_avatar') or user_data.get('profile_image')

        self.redirect(profile_image)

    @authenticated
    @asynchronous
    @gen.engine
    def post(self):
        context = self.context()
        current_user_id = unicode(context.get('current_user_id'))
        base_url = context.get('base_url')

        logging.info("BASE URL ---> {}".format(base_url))

        files = {}
        post_data = {}

        # Fill the buffer and return filename 'user_id.extension'
        def get_image_data():
            content_type = self.request.headers.get('content-type')
            body = b'{}'.format(self.request.body)

            parse_body_arguments(content_type, body, post_data, files)

            file_data = files['profile-image'][0].get('body')
            original_file_name = files['profile-image'][0].get('filename')

            extension = original_file_name.split('.')[-1]
            file_name = u'{}.{}'.format(slugify(current_user_id), extension)

            return file_data, file_name

        def profile_image_path(filename):
            media_path = self.user_options.get('server', 'media_path')
            profile_image_path = os.path.join(media_path, 'custom-profile-images')

            for _dir in [media_path, profile_image_path]:
                if not os.path.exists(_dir):
                    os.mkdir(_dir)

            return os.path.join(profile_image_path, filename)

        def sync(filename, filepath, fileurl):
            return self.cloudsync.put('custom-profile-images', filepath, prehook="avatar.sh")

        filedata, filename = get_image_data()
        filepath = profile_image_path(filename)

        with open(filepath, 'wb') as f:
            f.write(filedata)

        fileurl = os.path.join(self.user_options.get('server', 'media_url'),
                                                     'custom-profile-images', filename)

        response = yield sync(filename, filepath, fileurl)

        if not response or response.code >= 400:
            self.db.users.update({'_id': ObjectId(current_user_id)},
                                 {'$set': {'profile_image': default_profile_image}})
        else:
            abs_url = '{}/{}'.format(base_url.rstrip('/'),
                                    fileurl.lstrip('/'))

            self.db.users.update({'_id': ObjectId(current_user_id)},
                                 {'$set': {'profile_image': abs_url},
                                  '$pull': {'progress': 'profile_image'}})

        self.write("OK")
        self.finish()


class CoverImageHandler(UrlistHandler, UrlistContextMixin):
    @authenticated
    @asynchronous
    @gen.engine
    def post(self, list_hash):
        context = self.context()
        current_user_id = unicode(context.get('current_user_id'))

        q = {'hash': list_hash}

        if not self.current_user.get('__admin'):
            q['user_id'] = current_user_id

        list_data = self.db.urlists.find_one(q, {'hash': 1})

        if not list_data:
            raise HTTPError(401)

        base_url = context.get('base_url')

        file_data = self.get_argument('png_base64', None)

        if not file_data:
            raise HTTPError(500)

        file_name = u'{}.jpg'.format(list_hash)

        media_path = self.user_options.get('server', 'media_path')
        profile_image_path = os.path.join(media_path, 'custom-list-images')
        file_path = os.path.join(profile_image_path, file_name)

        for _dir in [media_path, profile_image_path]:
            if not os.path.exists(_dir):
                os.mkdir(_dir)

        cleaned_file_data = file_data.split('base64,')[-1]
        decoded_file_data = base64.b64decode(cleaned_file_data)

        img = Image.open(BytesIO(decoded_file_data))
        img.save(file_path, quality_val=80)

        now = datetime.datetime.now()

        cover_url = '/'.join(x.strip('/') for x in [
                              self.user_options.get('server', 'base_url'),
                              self.user_options.get('server', 'media_url'),
                              'custom-list-images',
                              '{}.{}'.format(list_hash, "jpg")])

        self.db.urlists.update({'hash': list_hash},
                                {'$set': {'cover_image_v': now,
                                          'cover_image': cover_url}})

        response = yield self.cloudsync.put('custom-list-images', file_path)

        self.write(cover_url)
        self.finish()

    @authenticated
    @asynchronous
    @gen.engine
    def delete(self, list_hash):
        context = self.context()
        current_user_id = unicode(context.get('current_user_id'))

        list_data = self.db.urlists.find_one({'hash': list_hash, 'user_id': current_user_id}, {'hash': 1})

        if not list_data:
            raise HTTPError(401)

        file_name = u'{}.jpg'.format(list_hash)

        media_path = self.user_options.get('server', 'media_path')
        profile_image_path = os.path.join(media_path, 'custom-list-images')
        file_path = os.path.join(profile_image_path, file_name)

        os.remove(file_path)

        response = yield self.cloudsync.delete('custom-list-images', file_name)

        self.db.urlists.update({'hash': list_hash},
                                {'$set': {'cover_image_v': datetime.datetime.now()},
                                 '$unset': {'cover_image': ""}})

        self.finish()


class UserAutocomplete(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self):
        query = self.get_argument('q') or self.get_argument('query')

        api_msg = MBMessage(None, 'users_autocomplete',
                            {'query': query}, {}, self.context())

        resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class HashtagsHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self):
        api_msg = MBMessage(None, 'fetch_hashtags',
                            {}, {}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()

class FacebookFriendsHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self):
        api_msg = MBMessage(None, 'fetch_facebook_friends',
                            {}, {}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class FacebookLinksHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self):
        api_msg = MBMessage(None, 'fetch_facebook_links',
                            {}, {}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()

class HashtagHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self, hashtag):
        api_msg = MBMessage(None, 'fetch_hashtag',
                    {'hashtag': hashtag}, {}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()

class NotificationsHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self, user_id=None):
        if not user_id:
            user_id = self.context().get("current_user_id")

        api_msg = MBMessage(None, 'fetch_notifications',
                    {'user_id': user_id}, {}, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            go_resp  = yield go.dispatch()

            resp = go.make_response(go_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()



class MotherbrainHandler(UrlistHandler, UrlistContextMixin):
    def get(self):
        self.write('')
        self.finish()

    @asynchronous
    @authenticated
    @gen.engine
    def post(self):
        api_msg = self.decode_api_msg(self.request.body)

        go = GoHandler.can_handle(self, api_msg)
        if go:
            resp = yield go.dispatch()

            resp_msg = go.make_response(resp)
        else:
            resp = yield self.dispatch(api_msg)

            resp_msg = MBMessage(resp.msg_id, resp.action,
                                 api_msg.target, resp.payload, resp.context, merge_target=False)

            self.mb_cookies(resp)

        self.set_header('Content-Type', 'application/json')
        self.write(resp_msg.to_json())
        self.finish()


class HyperdriveHandler(UrlistHandler, UrlistContextMixin, MBMessageMixin):
    def get(self):
        self.write('')
        self.finish()

    @asynchronous
    @authenticated
    @gen.engine
    def post(self):
        self.set_header('Content-Type', 'application/json')

        body_data = self.request.body
        messages = json.loads(body_data)

        api_msgs = [self.decode_api_msg(msg_data) for msg_data in messages]

        go_handlers = {}

        resps = yield [GoHandler.hyperdrive_dispatch(self, go_handlers, api_msg)
                       for api_msg in api_msgs]

        def _unmarshal(raw_response):
            resp = GoHandler.hyperdrive_decode(go_handlers, raw_response)

            if not resp:
                logging.info("GO ERROR")

                return None

            resp_msg = MBMessage(resp.msg_id, resp.action, resp.target,
                                 resp.payload, resp.context, merge_target=False)

            self.mb_cookies(resp)

            return resp_msg.to_json()

        resp_msgs = [_unmarshal(resp) or "" for resp in resps]

        json_resp = '[{}]'.format(','.join(resp_msgs))

        self.write(json_resp)
        self.finish()
