import urllib
import urlparse
import json
import logging
import datetime

from tornado import gen
from tornado.httpclient import AsyncHTTPClient, HTTPResponse

from motherbrain.com.messages import MBMessage

fetch_addr = 'http://127.0.0.1/__fetch'

GO_ACTIONS = {'fetch_url_data':  ['http://127.0.0.1:5100', 'GoFetchUrlDataHandler'],
              'fetch_list':      [fetch_addr, 'GoFetchHandler'],
              'fetch_discovery': [fetch_addr, 'GoFetchDiscoveryHandler'],
              'fetch_landing':   [fetch_addr, 'GoFetchLandingHandler'],
              'fetch_user':      [fetch_addr, 'GoFetchUserHandler'],
              'fetch_user_network': [fetch_addr, 'GoFetchUserNetworkHandler'],
              'fetch_focuson':   [fetch_addr, 'GoFetchFocusOnHandler'],
              'fetch_toplists':  [fetch_addr, 'GoFetchTopListsHandler'],
              'fetch_followmore': [fetch_addr, 'GoFetchFollowMoreHandler'],
              'fetch_topusers':  [fetch_addr, 'GoFetchTopUsersHandler'],
              'fetch_popular':   [fetch_addr, 'GoFetchPopularHandler'],
              'fetch_user_profile': [fetch_addr, 'GoFetchProfileHandler'],
              'fetch_contrib_notifications': [fetch_addr, 'GoFetchContribNotifications'],
              'search_url':      [fetch_addr, 'GoSearchUrl'],
              'beta_search_url': [fetch_addr, 'GoGlobalSearchUrl'],
              'fetch_hashtag':   [fetch_addr, 'Hashtag'],
              'fetch_hashtags':  [fetch_addr, 'Hashtags'],
              'fetch_facebook_friends': [fetch_addr, 'FacebookFriends'],
              'fetch_facebook_links': [fetch_addr, 'FacebookLinks'],
              'fetch_list_by_categories': [fetch_addr, 'Category'],
              'fetch_notifications': [fetch_addr, 'Notifications'],
              }


class GoHandler(object):
    def __init__(self, handler, api_msg):
        target = api_msg.target or {}
        payload = api_msg.payload or {}

        self.handler = handler
        self.action = api_msg.action
        self.payload = dict(payload, **target)
        self.db = handler.db
        self.api_msg = api_msg
        self.msg_id = self.api_msg.msg_id
        self.context = self.api_msg.context

    def make_cache_callback(self):
        def _callback(cached_result, callback=None):
            callback(cached_result)

        return _callback

    def server_addr(self):
        return GO_ACTIONS.get(self.action)[0]

    @staticmethod
    def can_handle(handler, api_msg):
        action = api_msg.action

        if not action in GO_ACTIONS:
            return None

        cls_name  = GO_ACTIONS.get(action)[1]
        cls = globals().get(cls_name)

        if not cls:
            return None

        return cls(handler, api_msg)

    @staticmethod
    def hyperdrive_dispatch(handler, go_handlers, api_msg):
        go = GoHandler.can_handle(handler, api_msg)

        msg_id = api_msg.msg_id or str(uuid.uuid4)

        if go:
            go_handlers[msg_id] = go
            dsp = go.dispatch()
        else:
            dsp = handler.dispatch(api_msg)

        return dsp

    @staticmethod
    def hyperdrive_decode(go_handlers, raw_response):
        if not isinstance(raw_response, HTTPResponse):
            return raw_response

        response_body = raw_response.body

        try:
            response_data = json.loads(response_body)
        except ValueError:
            response_data = None

        if not response_data:
            return None

        request_id = response_data.get('RequestId')

        go_handler = go_handlers[request_id]

        return go_handler.make_response(raw_response)


class GoFetchUrlDataHandler(GoHandler):
    def cache_set(self, cache_key, favicon_addr):
        if not favicon_addr:
            return None

        cache = self.db.favicon_cache
        cache.update({'netloc': cache_key},
                     {'$set': {'address': favicon_addr}},
                      upsert=True)

    def make_response(self, response_data):
        response_body = response_data.body
        response_data = json.loads(response_body)

        cache_key = getattr(self, 'cache_key', None)

        favicon = response_data.get('Favicon')

        if favicon:
            if cache_key:
                self.cache_set(cache_key, favicon)

            self.db.urlists.update({'hash': self.payload.get('list_hash'),
                                    'urls.hash': self.payload.get('url_hash')},
                                   {'$set': {'urls.$.favicon': favicon}})

        return  MBMessage(self.api_msg.msg_id, self.action,
                        {}, {'favicon': favicon}, self.api_msg.context)

    def endpoint(self):
        server_addr = self.server_addr()
        url_data = self._get_url_data(self.payload.get('list_hash'),
                                      self.payload.get('url_hash'))

        url = url_data.get('url')
        qs = urllib.urlencode({'url': url.encode('UTF-8')})

        return "{}?{}".format(server_addr, qs)

    def cache_get(self, endpoint):
        logging.debug('CACHE GET --- {}'.format(endpoint))

        def get_url_from_qs():
            url_parts = urlparse.urlparse(endpoint)
            qs_data = urlparse.parse_qs(url_parts.query) or {}

            url = qs_data.get('url')

            if not len(url):
                return None

            return url[0]

        def get_netloc(url):
            url_parts = urlparse.urlparse(url)

            return url_parts.netloc or None

        url = get_url_from_qs()

        if not url:
            return None

        netloc = get_netloc(url)

        if not netloc:
            return None

        self.cache_key = netloc

        cache = self.db.favicon_cache
        entry = cache.find_one({'netloc': netloc})

        logging.info("CACHE KEY --- {}".format(self.cache_key))

        if not entry:
            logging.debug('CACHE MISS --- {}'.format(endpoint))
            return None

        logging.debug('CACHE HIT --- {}'.format(endpoint))

        class CachedResponse(object):
            def __init__(self, body):
                self.body = body

        response =  CachedResponse(json.dumps({'Favicon': entry.get('address')}))

        return response

    def dispatch(self):
        logging.info('GO DISPATCH --- {}'.format(self.api_msg))

        action = self.action

        endpoint = self.endpoint()
        cached_result = self.cache_get(endpoint)

        if cached_result:
            return gen.Task(self.make_cache_callback(), cached_result)

        http_client = AsyncHTTPClient()

        return gen.Task(http_client.fetch, endpoint)

    def _get_url_data(self, list_hash, url_hash):
        urlists = self.db.urlists

        list_data = urlists.find_one({'hash': list_hash})

        if not list_data:
            return {}

        _urls = [x for x in list_data.get('urls', [])
                if x.get('hash') == url_hash]

        if not len(_urls):
            return {}

        return _urls[0]


class GoFetchHandler(GoHandler):
    def endpoint(self):
        server_addr = u"{}/list/{}".format(self.server_addr(), self.payload.get('list_hash'))

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))

    def dispatch(self):
        logging.info(u'GO DISPATCH --- {}'.format(self.api_msg))

        action = self.action
        endpoint = self.endpoint()

        callback = self.handler.get_argument("callback", "")
        endpoint = "{}&callback={}".format(endpoint, callback)

        logging.info("Callback: {}".format(endpoint))

        http_client = AsyncHTTPClient()
        return gen.Task(http_client.fetch, endpoint)

    def make_response(self, raw_response):
        response_body = raw_response.body

        try:
            response_payload = json.loads(response_body)
        except ValueError:
            return None

        if not isinstance(response_payload, dict):
            return None

        response_code = response_payload.get("ResponseCode", None)
        payload = response_payload.get("Payload")

        callback = response_payload.get("Callback")

        if callback:
            payload = "{}({});".format(callback, json.dumps(payload))

        if not response_code:
            action = self.action
        else:
            action = response_code

        return MBMessage(self.api_msg.msg_id, action,
                         {}, payload or {}, self.api_msg.context)


class GoFetchDiscoveryHandler(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/discovery/{}".format(self.server_addr(), self.context.get('current_user_id'))

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class GoFetchLandingHandler(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/landing/{}".format(self.server_addr(), self.payload.get('key'))

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class GoFetchProfileHandler(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/profile/{}".format(self.server_addr(), self.payload.get('user_id'))

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class GoFetchUserHandler(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/user/{}".format(self.server_addr(), self.payload.get('user_id'))

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class GoFetchContribNotifications(GoFetchHandler):
    def endpoint(self):
        current_user_id = self.context.get('current_user_id')

        server_addr = u"{}/contrib-notifications/{}".format(self.server_addr(),
                                                            current_user_id)

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class GoSearchUrl(GoFetchHandler):
    def endpoint(self):
        query = self.payload.get('query')

        server_addr = u"{}/search-results/{}".format(self.server_addr(), urllib.quote(query))

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class GoGlobalSearchUrl(GoFetchHandler):
    def endpoint(self):
        query = self.payload.get('query')

        server_addr = u"{}/global-search-results/{}".format(self.server_addr(), urllib.quote(query))

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id'),
                   'scope': self.payload.get('scope', 'me')}

        url = u"{}?{}".format(server_addr, urllib.urlencode(qs_data))

        logging.info(url)

        return url


class GoFetchUserNetworkHandler(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/network/{}".format(self.server_addr(),
                                                 self.payload.get('user_id'))

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id'),
                   'mode': self.payload.get('mode')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class GoFetchFocusOnHandler(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/focuson/{}".format(self.server_addr(), self.payload.get('edition', ''))

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class GoFetchPopularHandler(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/popular/".format(self.server_addr())

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class GoFetchTopListsHandler(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/toplists/{}".format(self.server_addr(),
                                               self.payload.get('edition', ''))

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class GoFetchTopUsersHandler(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/topusers/{}".format(self.server_addr(), self.payload.get('category'))

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class Category(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/category/{}".format(self.server_addr(), self.payload.get('categories'))

        user_id = self.context.get('current_user_id')
        sort = self.handler.get_argument("sort", "")
        network = self.handler.get_argument("network", False)

        qs_data = {'request_id': self.msg_id,
                   'user_id': user_id,
                   'sort': sort,
                   'network': network}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class Hashtag(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/hashtag/{}".format(self.server_addr(), self.payload.get('hashtag'))

        user_id = self.context.get('current_user_id')
        sort = self.handler.get_argument("sort", None)
        network = self.handler.get_argument("network", False)

        qs_data = {'request_id': self.msg_id,
                   'user_id': user_id,
                   'sort': sort,
                   'network': network}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class Hashtags(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/hashtags/".format(self.server_addr())

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class GoFetchFollowMoreHandler(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/followmore/".format(self.server_addr())

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))

class FacebookFriends(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/facebookfriends/".format(self.server_addr())

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))


class FacebookLinks(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/facebooklinks/".format(self.server_addr())

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))

class Notifications(GoFetchHandler):
    def endpoint(self):
        server_addr = u"{}/notifications/{}".format(self.server_addr(),
                                                    self.payload.get('user_id'))

        qs_data = {'request_id': self.msg_id,
                   'user_id': self.context.get('current_user_id')}

        return u"{}?{}".format(server_addr, urllib.urlencode(qs_data))
