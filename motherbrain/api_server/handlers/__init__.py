import os
import functools
import time
import uuid
import json
import logging
import datetime

import tornado.web

from bson.objectid import ObjectId
from bson import json_util

from tornado import gen
from tornado.web import HTTPError

from motherbrain.api_server.auth import OAuthException
from motherbrain.com.messages import MBMessage


# Support MongoDb Bson
_json = lambda x: json.dumps(x, default=json_util.default)


class CORSMixin(object):
    def set_default_headers(self, *args, **kwargs):
        opts = self.application.settings.get('options')
        origin = self.request.headers.get('Origin')
        cors_hosts = opts.get('server', 'cors_hosts')

        allowed_hosts = [x.strip() for x in cors_hosts.split(' ')]

        wildcard = '*'

        if origin in allowed_hosts or wildcard in allowed_hosts:
            [self.set_header(k, v)
             for k, v in self.__headers(origin).iteritems()]

        super(CORSMixin, self).set_default_headers(*args, **kwargs)

    def __headers(self, origin):
        logging.debug('APISRV::CORS --- Allowing origin: {}'.format(origin))

        return {'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Methods': 'GET, POST, PUT, HEAD, DELETE',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Credentials': 'true'}


class UrlistDBMixin(object):
    @property
    def db(self):
        return getattr(self, '_db', self.settings.get('db'))

    def change_db(self, new_db):
        setattr(self, '_db', new_db)


class UrlistHandler(CORSMixin, UrlistDBMixin, tornado.web.RequestHandler):
    def initialize(self, *args, **kwargs):
        self.user_options = self.settings.get('options')
        self.dispatcher = self.settings.get('dispatcher')
        self.cloudsync = self.settings.get('cloudsync')

        if 'settings' in kwargs:
            self.settings = kwargs.pop('settings')

        super(UrlistHandler, self).initialize(*args, **kwargs)

    def set_secure_cookie(self, *args, **kwargs):
        method = super(UrlistHandler,  self).set_secure_cookie

        if not 'domain' in kwargs:
            domain = self.user_options.get('oauth', 'cookie_domain')
            kwargs['domain'] = domain

        return method(*args, **kwargs)

    def clear_all_cookies(self):
        domain = self.user_options.get('oauth', 'cookie_domain')

        urlist_cookies = ['oauth_provider', 'oauth_token', 'oauth_user_id',
                          '_on_login_successful', 'anonymous_id']

        [self.clear_cookie(name, domain=domain) for name in urlist_cookies]

    def clear_oauth_cookies(self):
        domain = self.user_options.get('oauth', 'cookie_domain')

        urlist_cookies = ['oauth_provider', 'oauth_token', 'oauth_user_id',
                          'anonymous_id']

        [self.clear_cookie(name, domain=domain) for name in urlist_cookies]

    def guess_ctype(self):
        callback = self.get_argument("callback", False)

        if not callback:
            ctype = "application/json"
        else:
            ctype = "text/javascript"

        self.set_header("Content-Type", ctype)

    def dispatch(self, api_msg):
        f = self.dispatcher.send_msg

        return gen.Task(f, api_msg.msg_id, api_msg.action, api_msg.target,
                           api_msg.payload, api_msg.context)

    def dispatch_and_forget(self, api_msg):
        f = self.dispatcher.send_msg

        return f(api_msg.msg_id, api_msg.action, api_msg.target,
                 api_msg.payload, api_msg.context)

    def decode_api_msg(self, msg_data):
        context = getattr(self, 'context', {})

        if callable(context):
            context = context()

        if isinstance(msg_data, str):
            msg = MBMessage(msg_data)
        else:
            msg = MBMessage(*msg_data)

        msg.context = context

        return msg

    def mb_cookies(self, resp):
        """Motherbrain Cookies.

        When motherbrain payload contains a __cookies dict,
        set a cookie for each item.

        """

        if '__cookies' in resp.payload:
            cookies = resp.payload.pop('__cookies')

            self.clear_all_cookies()

            [self.set_secure_cookie(k, v) for k, v in cookies.iteritems()]

    def get_current_user(self):
        """Get Current User.

        If OAuth cookie data is found invoke the get_current_oauth_user,
        passing the 'provider' field as arg.

        Else we use the urlist login mixin which provide anonymous
        authentication and authentication through api token.
        """

        oauth_provider = self.get_secure_cookie('oauth_provider')

        if oauth_provider:
            logging.debug('APISRV::AUTH --- OAuth Provider {}'
                          ''.format(oauth_provider))

            oauth_user = self.get_current_oauth_user(oauth_provider)
        else:
            oauth_user = None

        if oauth_user:
            return oauth_user

        fallback_auth_method_name = 'get_current_urlist_user'
        fallback_auth_method = getattr(self, fallback_auth_method_name)

        return fallback_auth_method()

    def get_current_oauth_user(self, provider):
        token = self.get_secure_cookie('oauth_token')
        user_id = self.get_secure_cookie('oauth_user_id')

        if not token:
            return None

        token_key = '{}_last_token'.format(provider)
        id_key = '{}_id'.format(provider)

        user = self.db.users.find_one({token_key: token, id_key: user_id})

        if not user:
            return None

        return user

    def is_ajax(self):
            return "X-Requested-With" in self.request.headers and \
                self.request.headers['X-Requested-With'] == "XMLHttpRequest"

    def get_current_urlist_user(self):
        return self.get_current_anonymous_user()

    def get_current_anonymous_user(self):
        anon_id = self.get_secure_cookie('anonymous_id', None)
        anon_oid = ObjectId(anon_id)

        if not anon_id:
            anon_oid =  self.new_anonymous_user()

        anonymous_data = self.db.users.find_one({'_id': anon_oid})

        return anonymous_data

    def _anonymous_username(self):
        return 'anon_{}'.format(str(uuid.uuid4()).replace('-', ''))

    def new_anonymous_user(self):
        username = self._anonymous_username()

        anon_oid = self.db.users.insert({'username': username,
                                         'creation_time': datetime.datetime.now(),
                                         'is_anonymous': True}, safe=True)
        anon_id = str(anon_oid)

        self.set_secure_cookie('anonymous_id', anon_id)

        return anon_oid

    def options(self, *args, **kwargs):
        """Needed for Cors PreFlight request"""
        self.write('')

    def is_anonymous(self):
        if not self.current_user:
            return True

        return self.current_user.get('is_anonymous')


def godmode(method):
    """Execute the function only if GODMODE file exists"""
    @functools.wraps(method)
    def wrapper(self, *args, **kwargs):
        if not os.path.exists('GODMODE'):
            raise HTTPError(403)
        return method(self, *args, **kwargs)
    return wrapper


# same stuff as smart_user_id decorator
def _smart_user_id(self, user_id):
    if ObjectId.is_valid(user_id):
        return user_id

    if user_id in ['~', '~/']:
        return str(self.current_user.get('_id'))

    user_data = self.db.users.find_one({'username': user_id}, ['_id'])

    if not user_data:
        raise HTTPError(500)

    user_id = str(user_data.get('_id'))

    return user_id


def smart_user_id(method):
    """Smart user id decorator

    Remove trailing slash and check if user_id is a mongo id or username,
    always returning user_id.

    """
    @functools.wraps(method)
    def wrapper(self, user_id):
        _user_id = _smart_user_id(self, user_id)

        return method(self, _user_id)
    return wrapper
