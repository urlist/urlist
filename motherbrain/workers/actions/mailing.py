import logging
import datetime
import json
import urlparse

from bson.objectid import ObjectId
from itertools import chain

from mailsnake import MailSnake

from motherbrain import conf, models
from motherbrain.workers import clusters, actions
from motherbrain.workers.decorators import secure_action

from motherbrain.models import user, urlist


_settings = conf.get_settings()
db = conf.get_db(_settings)
DEBUG = not conf.is_production()


def _default_favicon(base_url, url):
    favicon = 'img-v0.6/favicon-placeholder.png'

    placeholder = '/'.join([base_url.rstrip('/'), favicon])

    urlparts = urlparse.urlparse(url)

    if hasattr(urlparts, 'netloc'):
        netloc = urlparts.netloc

        if not netloc:
            return placeholder

        cache_data = db.mbcache.find_one({'key': netloc})

        if not cache_data:
            return placeholder

        favicon = cache_data.get('value')

        if favicon:
            return favicon

    return placeholder


def _urlist_auth(context):
    user_id = context.get('current_user_id')
    result = db.users.find_one({'_id': ObjectId(user_id)}, safe=True)

    if not result:
        return (user_id, None)

    return (user_id, result)


def _fetch_list(list_hash):
    return db.urlists.find_one({'hash': list_hash})


def _fetch_url(list_hash, url_hash):
    list_data = _fetch_list(list_hash)
    url_data = [url for url in list_data.get('urls')
                if url.get('hash') == url_hash].pop()

    return list_data, url_data


def _fetch_user(user_id, context=None):
    user_data = db.users.find_one({'_id': ObjectId(user_id)})

    if not user_data:
        raise Exception('UserDoesNotExist: {}'.format(user_id))

    user_model = models.profile.Model(user_data)(context)

    return user_data, user_model


def _fetch_url_owner(data, context=None):
    owner_id = data.get('user_id')
    owner_data, owner_model = _fetch_user(owner_id)

    return str(owner_id), owner_data, owner_model


def _fetch_mail_data(user_id):
    user_data = db.users.find_one({'_id': ObjectId(user_id)})

    if not user_data.get('email'):
        return

    return (user_data.get('email'), user_data.get('sceen_name'))


def _can_receive(user_id, flag):
    if isinstance(user_id, dict):
        user_data = user_id
    else:
        user_data = db.users.find_one({'_id': ObjectId(user_id)})

    return user_data.get(flag)


def humanize_time(datetime_str):
    datetime_str = datetime_str.split('T')[0]
    datetime_obj = datetime.datetime.strptime(datetime_str, "%Y-%m-%d")

    return datetime_obj.strftime('%A, %d %B %Y')


def send_message(template_name, subject, rcpts, context,
                 tmpl_content=None, from_email='no_reply@urli.st'):
    """Send mandrill message.

    If DEBUG is set, recipients is forced to urlist crew,
    and mail is sent twice using TEST templates and normale templates;
    all mail are tracked in 'mailing' collection, stored with original recipients.

    """

    tmpl_content = tmpl_content or {}

    m = MailSnake('234cb996-7286-4c08-a4ec-8993afe6495c', api='mandrill')

    global_merge_vars = [{'name': unicode(k), 'content': unicode(v)}
                          for k, v in context.iteritems()]

    if not isinstance(rcpts, (list, tuple)) and not DEBUG:
        logging.info('Cannot send mail, no recipients')
        return

    recipients = [{'email': rcpt_email, 'name': rcpt_name}
                  for rcpt_email, rcpt_name in rcpts]

    tmpl_content_ = [{'name': k, 'content': v}
                    for k, v in tmpl_content.iteritems()]

    if DEBUG:
        debug_message = {'subject': u'TEST ~~~ {}'.format(subject)}

        db.mailing.insert({'rcpts': recipients, 'subject': subject, 'template': template_name})

        recipients = [{'email': 'crew+test@urli.st', 'name': 'Urlist Crew'}]

        google_analytics_domains = ["urlist.no-ip.org"]
    else:
        google_analytics_domains = ["urli.st"]

    message = {'global_merge_vars': global_merge_vars,
               'subject': subject,
               'google_analytics_domains': google_analytics_domains,
               'google_analytics_campaign': template_name,
               'from_email': from_email,
               'from_name': 'Urlist',
               'to': recipients}

    def send(message, template_name):
        m.messages.send_template(template_name=template_name,
                                template_content=tmpl_content_,
                                message=message)

    send(message, template_name)

    if DEBUG:
        send(dict(message, **debug_message),
             'test-{}'.format(template_name))


def _top_list_html(context, list_data):
    top_lists_tmpl = u"""
    <li style="margin: 0 0 10px">
        <a style="color: #6b6b6b; text-decoration: none" href="{host}/{list_hash}">
            <img style="display: block; float: left; width: 16px; height: 16px; margin: 0; margin-right: 10px;" src="{favicon}" alt >
            <span style="text-decoration: underline">{title}</span>
            <cite style="color: #bcbcbc; font-style: normal; margin-left: 0.25em">{domain}</cite>
        </a>
    </li>
    """

    host = context.get('base_url').rstrip('/')

    return top_lists_tmpl.format(**dict(list_data, **{'host': host}))

@secure_action(_urlist_auth, clusters.MAIL_QUEUE)
def invite_to_list(context, list_hash=None, sender_id=None, recv_id=None):
    template_name = 'invite-to-list'
    subject = "You're invited to join a list!"

    url_owner_oid = ObjectId(sender_id)
    recv_oid = ObjectId(recv_id)

    recv_data = db.users.find_one({'_id': recv_oid})
    recv_model = user.Model(recv_data)
    recv = recv_model(context)

    if 'email' not in recv_data:
        return

    url_owner_data = db.users.find_one({'_id': url_owner_oid})

    list_data = db.urlists.find_one({'hash': list_hash})
    list_model = urlist.Model(list_data)
    list_ = list_model(context)

    top_lists = list_.get('urls')[:3]
    top_lists_html = u' '.join([_top_list_html(context, list_data)
                                for list_data in top_lists])

    send_message(template_name,

                 subject,

                 [(recv_data.get('email'), recv.get('screen_name'))],

                 {'url_owner_username': url_owner_data.get('username'),
                  'url_owner_screen_name': url_owner_data.get('screen_name'),
                  'url_owner_avatar': url_owner_data.get('profile_image'),

                  'recv_username': recv.get('username'),
                  'recv_screen_name': recv.get('screen_name'),
                  'recv_avatar': recv.get('profile_image'),

                  'list_title': list_.get('title'),
                  'list_type': list_.get('type'),
                  'list_hash': list_.get('hash'),
                  'list_links_amount': list_.get('links_amount'),
                  'list_followers_amount': list_.get('followers_amount')},

                 tmpl_content={'top_lists': top_lists_html})

    return


@secure_action(_urlist_auth, clusters.MAIL_QUEUE)
def relist_url(context, list_hash=None,
               url_hash=None, source_list_hash=None, source_url_hash=None):
    template_name = 'relist-to'
    subject = "Your link has been relisted!"

    # DESTINATION URL DATA
    list_data, url_data = _fetch_url(list_hash, url_hash)
    list_model = models.urlist.Model(list_data)(context)

    relist_user_id, relist_user_data, relist_user_model = _fetch_url_owner(url_data, context)
    relist_user_followers_amount = len(relist_user_model.get('followed_by_users'))

    # SOURCE LIST DATA
    source_list_data, source_url_data = _fetch_url(source_list_hash, source_url_hash)
    source_list_model = models.profile.Model(source_list_data)(context)

    # OWNER OF THE SOURCE LIST
    url_owner_id, url_owner_data, url_owner_model = _fetch_url_owner(source_list_data, context)
    url_owner_followers_amount = len(url_owner_model.get('followed_by_users'))

    if not _can_receive(url_owner_data, 'notify_relist'):
        return

    rcpts_id = [url_owner_id]

    def _top_link_data(data):
        model = models.url.Model(data)

        return model(context)

    top_links = list_data.get('urls')[:3]
    top_links_html = u' '.join([_top_list_html(context, _top_link_data(x))
                                for x in top_links])

    send_message(template_name,

                 subject.format(relist_user_data.get('screen_name')),

                 [_fetch_mail_data(uid) for uid in rcpts_id],

                 {'url_owner_screen_name': url_owner_data.get('screen_name'),

                  'relist_user_screen_name': relist_user_data.get('screen_name'),
                  'relist_user_username': relist_user_data.get('username'),
                  'relist_user_profile_image': relist_user_data.get('profile_image'),

                  'list_title': source_list_data.get('title'),
                  'list_hash': source_list_hash,
                  'list_followers_amount': source_list_model.get('followers_amount'),
                  'list_links_amount': source_list_model.get('links_amount'),

                  'url_title': source_url_data.get('title'),
                  'url_hash': source_url_hash,

                  'target_list_title': list_data.get('title'),
                  'target_list_type': list_data.get('type'),
                  'target_list_hash': list_hash,
                  'target_list_links_amount': list_model.get('links_amount')},

                 tmpl_content={'top_lists': top_links_html})

    return


@secure_action(_urlist_auth, clusters.MAIL_QUEUE)
def new_url(context, list_hash=None, url_hash=None):
    template_name = 'added-link-01'
    subject = u"{} added a link to one of your lists on Urlist"

    list_data = db.urlists.find_one({'hash': list_hash})
    url_data = [url for url in list_data.get('urls')
                if url.get('hash') == url_hash].pop()

    url_owner_id, url_owner_data, _  = _fetch_url_owner(url_data, context)

    current_user_id = context.get('current_user_id')

    url_model = models.url.Model(url_data)(context)

    followers = [str(x) for x in list_data.get('followers', [])]
    contributors = [x.get('user_id') for x in list_data.get('contributors', [])]

    if url_owner_id == list_data.get('user_id'):
        list_owner = []
    else:
        list_owner = [list_data.get('user_id')]

    _rcpts = chain(followers, contributors, list_owner)

    rcpts_id = set([x for x in _rcpts
                    if _can_receive(x, 'notify_add_url') \
                       and not str(url_owner_id) == str(x)])

    def _fetch_mail_data(user_id):
        user_data = db.users.find_one({'_id': ObjectId(user_id)})

        if not user_data.get('email'):
            return

        return (user_data.get('email'), user_data.get('screen_name'))

    rcpts = (_fetch_mail_data(uid) for uid in rcpts_id if not rcpts_id == current_user_id)

    favicon = url_data.get('favicon',
                           _default_favicon(context.get('base_url'),
                                            url_data.get('url')))

    send_message(template_name,

                 subject.format(url_owner_data.get('screen_name')),

                 [x for x in rcpts if isinstance(x, (tuple, list))],

                 {'url_owner_username': url_owner_data.get('username'),
                  'url_owner_screen_name': url_owner_data.get('screen_name'),
                  'url_owner_profile_image': url_owner_data.get('profile_image'),

                  'list_title': list_data.get('title'),
                  'list_hash': list_hash,

                  'url_title': url_data.get('title'),
                  'url_hash': url_hash,
                  'url_favicon': favicon,
                  'url_domain': url_model.get('domain'),
                  'url_description': url_data.get('description', ""),
                  'url_created_at': humanize_time(url_model.get('creation_time'))})

    return


@secure_action(_urlist_auth, clusters.MAIL_QUEUE)
def new_user_follower(context, user_id=None, target_user_id=None):
    template_name = 'user-follows-you'
    subject = "You have a new follower!"

    user_data, user_model = _fetch_user(user_id, context)
    target_user_data, _ = _fetch_user(target_user_id, context)

    if not _can_receive(target_user_data, 'notify_follow_user'):
        return

    send_message(template_name,

                 subject,

                 [_fetch_mail_data(target_user_id)],

                 {'follower_screen_name': user_data.get('screen_name'),
                  'follower_username': user_data.get('username'),
                  'follower_profile_image': user_data.get('profile_image'),

                  'follower_followers_amount': user_model.get('followers_amount'),

                  'follower_location': user_data.get('location'),
                  'follower_short_bio': user_data.get('short_bio') or "",

                  'follower_links_amount': user_model.get('links_amount'),
                  'follower_lists_amount': user_model.get('lists_amount'),

                  'follower_facebook_username': user_data.get('facebook_username'),
                  'follower_twitter_username': user_data.get('twitter_username')})

    return


@secure_action(_urlist_auth, clusters.MAIL_QUEUE)
def new_list_follower(context, user_id=None, list_hash=None):
    template_name = 'user-follows-your-list'
    subject = u"{} bookmarked one of your lists"

    user_data, user_model = _fetch_user(user_id, context)
    list_data = _fetch_list(list_hash)
    list_model = models.urlist.Model(list_data)(context)

    follower_screen_name = user_data.get('screen_name', None)

    if not follower_screen_name or follower_screen_name.strip() == '':
        follower_screen_name = user_data.get('username')

    if not _can_receive(list_data.get('user_id'), 'notify_follow_list'):
        return

    send_message(template_name,

                 subject.format(follower_screen_name),

                 [_fetch_mail_data(list_data.get('user_id'))],

                 {'follower_screen_name': follower_screen_name,
                  'follower_username': user_data.get('username'),
                  'follower_profile_image': user_data.get('profile_image'),

                  'follower_followers_amount': user_model.get('followers_amount'),

                  'follower_location': user_data.get('location'),
                  'follower_short_bio': user_data.get('short_bio'),

                  'follower_links_amount': user_model.get('links_amount'),
                  'follower_lists_amount': user_model.get('lists_amount'),

                  'follower_facebook_username': user_data.get('facebook_username'),
                  'follower_twitter_username': user_data.get('twitter_username'),

                  'list_title': list_data.get('title'),
                  'list_hash': list_data.get('hash')})

    return


@secure_action(_urlist_auth, clusters.MAIL_QUEUE)
def new_feedback(context, user_id=None, user_agent=None, referral=None,
                 email=None, message=None, created_at=None):

    template_name = 'user-feedback'
    subject = u"[FEEDBACK] {}"

    user_data = db.users.find_one({'_id': ObjectId(user_id)})

    screen_name = user_data.get('screen_name') or 'Anonymous User'
    email = email or user_data.get('email')

    send_message(template_name,

                 subject.format(screen_name),

                 [('crew@urli.st', 'Urlist Crew')],

                 {'user_screen_name': screen_name,
                  'message': message,
                  'referral': referral,
                  'ua': user_agent},

                 from_email=email or 'anonymous@urli.st')

    return


@secure_action(_urlist_auth, clusters.MAIL_QUEUE)
def report_list(context, list_hash=None,
                email=None, message=None, user_agent=None):

    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        raise OperationalError('ListDoesNotExists')

    list_hash = list_data.get('hash')
    list_title = list_data.get('title')

    template_name = 'report-list'
    subject = "[LIST-REPORT] {} - {}"

    user_oid = context.get('_id')
    user_data = db.users.find_one({'_id': user_oid}) or {}

    screen_name = user_data.get('screen_name') or 'Anonymous User'
    email = email or user_data.get('email')

    send_message(template_name,

                 subject.format(list_hash, list_title),

                 [('Urlist Badass Crew', 'crew@urli.st')],

                 {'user_screen_name': screen_name,
                  'list_hash': list_hash,
                  'list_title': list_title,
                  'message': message,
                  'ua': user_agent},

                 from_email=email or 'anonymous@urli.st')

    return


@secure_action(_urlist_auth, clusters.MAIL_QUEUE)
def signup_confirm(context, email=None, activation_code=None):
    api_root = _settings.get('env', 'api_root')

    if not email:
        raise OperationalError('No recipients')

    template_name = 'signup-confirm'
    subject = "Confirm your email"

    user_data = db.users.find_one({'email': email})
    user_id = str(user_data.get('_id'))

    confirmation_url = '{}/activate/{}'.format(api_root, activation_code)

    send_message(template_name,

                 subject,

                 [_fetch_mail_data(user_id)],

                 {'activation_url': confirmation_url})

    return


@secure_action(_urlist_auth, clusters.MAIL_QUEUE)
def recover_password(context, email=None, recover_code=None):
    api_root = _settings.get('env', 'api_root')

    if not email:
        raise OperationalError('No recipients')

    template_name = 'recover-password'
    subject = "Recover your Urlist account"

    user_data = db.users.find_one({'email': email})
    user_id = str(user_data.get('_id'))

    confirmation_url = '{}/recover/{}'.format(api_root, recover_code)

    send_message(template_name,

                 subject,

                 [_fetch_mail_data(user_id)],

                 {'recover_url': confirmation_url})

    return

@secure_action(_urlist_auth, clusters.MAIL_QUEUE)
def welcome(context, user_id=None):
    template_name = 'welcome'
    subject = 'Welcome to Urlist!'

    user_data, user_model = _fetch_user(user_id, context)
    username = user_data.get('username')
    email = user_data.get('email')
    screen_name = user_data.get('screen_name')

    if not email:
        return

    send_message(template_name,

                 subject,

                 [(email, screen_name)],

                 {'username': username,
                  'email': email},

                 tmpl_content={})

    return

@secure_action(_urlist_auth, clusters.MAIL_QUEUE)
def share_list(context, list_hash=None, message=None, emails=None):
    template_name = 'share-list'
    subject = 'Someone shared a list with you'

    list_owner_id = context.get('current_user_id')

    list_owner_data, list_owner_model = _fetch_user(list_owner_id, context)

    list_data = db.urlists.find_one({'hash': list_hash})
    list_model = urlist.Model(list_data)
    list_ = list_model(context)

    top_lists = list_.get('urls')[:3]
    top_lists_html = u' '.join([_top_list_html(context, list_data)
                                for list_data in top_lists])

    send_message(template_name,

                 subject,

                 [(x, '') for x in emails.split(' ')],

                 {'url_owner_username': list_owner_data.get('username'),
                  'url_owner_screen_name': list_owner_data.get('screen_name'),
                  'url_owner_profile_image': list_owner_data.get('profile_image'),

                  'list_title': list_.get('title'),
                  'list_type': list_.get('type'),
                  'list_hash': list_.get('hash'),
                  'list_links_amount': list_.get('links_amount'),
                  'list_followers_amount': list_.get('followers_amount')},

                 tmpl_content={'top_lists': top_lists_html})

    return


@secure_action(_urlist_auth, clusters.MAIL_QUEUE)
def invite_by_email(context, list_hash=None, message=None, emails=None):
    template_name = 'invite-to-list-via-email'
    subject = 'Someone shared a list with you'

    list_owner_id = context.get('current_user_id')

    list_owner_data, list_owner_model = _fetch_user(list_owner_id, context)

    list_data = db.urlists.find_one({'hash': list_hash})
    list_model = urlist.Model(list_data)
    list_ = list_model(context)

    top_lists = list_.get('urls')[:3]
    top_lists_html = u' '.join([_top_list_html(context, list_data)
                                for list_data in top_lists])

    send_message(template_name,

                 subject,

                 [(x, '') for x in emails.split(' ')],

                 {'url_owner_username': list_owner_data.get('username'),
                  'url_owner_screen_name': list_owner_data.get('screen_name'),
                  'url_owner_profile_image': list_owner_data.get('profile_image'),

                  'list_title': list_.get('title'),
                  'list_type': list_.get('type'),
                  'list_hash': list_.get('hash'),
                  'list_links_amount': list_.get('links_amount'),
                  'list_followers_amount': list_.get('followers_amount')},

                 tmpl_content={'top_lists': top_lists_html})

    return


@secure_action(_urlist_auth, clusters.MAIL_QUEUE)
def suggest_url(context, list_hash=None, url=None, description=None):
    template_name = 'suggested-link'
    subject = u"{} suggested a link to one of your lists on Urlist"

    list_data = db.urlists.find_one({'hash': list_hash})

    owner_id = list_data.get('user_id')
    owner = db.users.find_one({'_id': ObjectId(owner_id)})

    if not owner.get('notify_suggest_url'):
        return

    suggest = db.users.find_one({'_id': ObjectId(context.get('current_user_id'))})

    if not owner.get('email'):
        return

    send_message(template_name,

                 subject.format(suggest.get('screen_name')),

                 [(owner.get('email'), owner.get('screen_name'))],

                 {'owner_username': owner.get('username'),
                  'owner_screen_name': owner.get('screen_name'),
                  'owner_profile_image': owner.get('profile_image'),

                  'list_title': list_data.get('title'),
                  'list_hash': list_hash,

                   'suggest_url': url,
                   'suggest_description': description,
                   'suggest_screen_name': suggest.get('screen_name'),
                   'suggest_username': suggest.get('username'),
                   'suggest_profile_image': suggest.get('profile_image')}
                 )

    return
