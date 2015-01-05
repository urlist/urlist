import json
import logging
import tornado.web
import tornado.auth

from tornado.web import HTTPError, asynchronous
from tornado import gen

from motherbrain.com.messages import MBMessage

from motherbrain.api_server.auth import OAuthException
from motherbrain.api_server.handlers import UrlistDBMixin, \
                                            CORSMixin, UrlistHandler
from motherbrain.api_server.handlers.api import UrlistContextMixin
from motherbrain.api_server.auth.account import FacebookOAuthAccount, \
                                           TwitterOAuthAccount, \
                                           GoogleOAuthAccount


def _handle_next(handler, next_url=None):
    if next_url:
        handler.clear_cookie('_on_login_successful')

        try:
            clean_url = urllib.urlunquote(next_url)
        except:
            logging.warning("Cannot unquote url: %s", next_url)
            clean_url = next_url

        handler.redirect(clean_url)
    else:
        handler.finish()

def _login_or_die(handler, account, next_url=None):
    current_user = handler.get_current_user()
    is_anonymous = current_user.get('is_anonymous')

    if not current_user or is_anonymous:
        oauth_action = lambda: account.login(handler)
    else:
        oauth_action = lambda:  account.connect(handler, current_user)

    try:
        oauth_action()
    except OAuthException as e:
        c = '?'
        if next_url.find(c) != -1:
            c = '&'

        next_url = '{}{}error={}'.format(next_url, c, str(e))

    handler.redirect(next_url)


class ActivationHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @gen.engine
    def get(self, activation_code):
        api_msg = MBMessage(None, 'activate_account',
                            {}, {'activation_code': activation_code},
                            self.context())

        resp = yield self.dispatch(api_msg)

        self.clear_all_cookies()
        self.mb_cookies(resp)

        webclient_url = self.user_options.get('server', 'webclient_url')
        self.redirect(webclient_url)


class WhoamiHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @gen.engine
    def get(self):
        self.set_header('Content-Type', 'application/json')

        context = self.context()
        user_id = context.get('current_user_id')

        api_msg = MBMessage(None, 'fetch_user',
                            {'user_id': user_id}, {},
                            self.context())

        resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class RecoverHandler(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @gen.engine
    def get(self, recover_code):
        self.clear_all_cookies()

        webclient_url = self.user_options.get('server', 'webclient_url')
        recover_url = '{}/?d=recover&recover_code={}' \
                      ''.format(webclient_url.rstrip('/'), recover_code)

        self.redirect(recover_url)


class LoginHandler(UrlistHandler, UrlistContextMixin):
    def get(self):
        next_url = self.get_argument('next', None)

        def success():
            if next_url:
                self.redirect(next_url)

            return

        def fail():
            raise HTTPError(401, 'Thou shalt not pass.')

        if self.current_user:
            return success()

        self.clear_all_cookies()
        self.new_anonymous_user()

        if self.current_user:
            return success()

        fail()

    @asynchronous
    @gen.engine
    def post(self):
        post_data = json.loads(self.request.body)

        email = post_data.get('email')
        username = post_data.get('username')
        password = post_data.get('password')

        api_msg = MBMessage(None, 'authenticate',
                            {'username': email or username},
                            {'password': password}, self.context())

        resp = yield self.dispatch(api_msg)

        resp_msg = MBMessage(resp.msg_id, resp.action,
                             api_msg.target, resp.payload, resp.context, merge_target=False)

        self.mb_cookies(resp)

        self.set_header('Content-Type', 'application/json')
        self.write(resp_msg.to_json())
        self.finish()

    def options(self, *args, **kwargs):
        """Needed for Cors PreFlight request"""
        self.write('')


class LogoutHandler(UrlistHandler):
    def get(self):
        self.clear_all_cookies()

        self.write('Yo dawg!')

    def post(self):
        self.clear_all_cookies()

        self.write('Yo dawg!')

    def options(self, *args, **kwargs):
        """Needed for Cors PreFlight request"""
        self.write('')


class FacebookLoginHandler(LoginHandler,
                           UrlistDBMixin,
                           tornado.auth.FacebookGraphMixin):
    @tornado.web.asynchronous
    def get(self):
        next_url = self.get_argument('next', None)
        error = self.get_argument('error', None)

        if error:
            self.redirect("{}?error=FBConnectAborted".format(self.context().get('base_url')))

        options = self.settings.get('options')
        facebook_redirect_uri = options.get('oauth', 'facebook_redirect_uri')

        if next_url:
            self.set_secure_cookie('_on_login_successful', next_url)

        if self.get_argument("code", False):
            self.get_authenticated_user(
                    redirect_uri=facebook_redirect_uri,
                    client_id=self.settings['facebook_api_key'],
                    client_secret=self.settings['facebook_secret'],
                    code=self.get_argument('code'),
                    callback=self.async_callback(self._on_login))

            return

        self.authorize_redirect(redirect_uri=facebook_redirect_uri,
                client_id=self.settings['facebook_api_key'],
                extra_params={'scope': 'email,publish_stream,'
                                       'publish_actions,user_location'})

    def _on_login(self, user):
        next_url = self.get_secure_cookie('_on_login_successful')

        if not user:
            self.clear_all_cookies()

            raise tornado.web.HTTPError(500, 'Facebook authentication failed.')

        def _login(data):
            _data = dict(user, **data)

            account = FacebookOAuthAccount(self.settings, _data)

            _login_or_die(self, account, next_url)

        self.facebook_request("/me", access_token=user.get('access_token'),
                              callback=_login)


class TwitterLoginHandler(LoginHandler,
                          UrlistDBMixin,
                          tornado.auth.TwitterMixin):
    @tornado.web.asynchronous
    def get(self):
        next_url = self.get_argument('next', None)

        if next_url:
            self.set_secure_cookie('_on_login_successful', next_url)

        if self.get_argument("oauth_token", None):
            self.get_authenticated_user(self.async_callback(self._on_auth))

            return

        self.authorize_redirect()

    def _on_auth(self, user):
        next_url = self.get_secure_cookie('_on_login_successful')

        if not user:
            self.clear_all_cookies()

            raise tornado.web.HTTPError(500, "Twitter authentication failed.")

        account = TwitterOAuthAccount(self.settings, user)
        _login_or_die(self, account, next_url)


class GoogleLoginHandler(LoginHandler,
                         UrlistDBMixin,
                         tornado.auth.GoogleMixin):
    @tornado.web.asynchronous
    def get(self):
        next_url = self.get_argument('next', None)

        if next_url:
            self.set_secure_cookie('_on_login_successful', next_url)

        if self.get_argument("openid.mode", None):
            self.get_authenticated_user(self.async_callback(self._on_auth))
            return

        base_url = self.user_options.get('server', 'base_url').rstrip('/')
        callback_uri = '{}/login/google'.format(base_url)

        self.authenticate_redirect(callback_uri=callback_uri)

    def _on_auth(self, user):
        next_url = self.get_secure_cookie('_on_login_successful')

        if not user:
            raise tornado.web.HTTPError(500, 'Google auth failed')

        account = GoogleOAuthAccount(self.settings, user)
        _login_or_die(self, account, next_url)
