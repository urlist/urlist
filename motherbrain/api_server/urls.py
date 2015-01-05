import tornado.web

from motherbrain.api_server import handlers

import handlers.auth
import handlers.api
import handlers.debug
import handlers.monitor
import handlers.tracker


debug_handlers = [
    (r'/__retrieve$',
        handlers.debug.RetrieveHandler),

    (r'/__message/(.*)$',
        handlers.debug.MotherbrainQueryStringMessenger),

    (r'/__motherbrain/dispatcher-(\d+)$', handlers.debug.MotherbrainMessenger),
    (r'/__motherbrain', handlers.debug.MotherbrainMessenger),

    (r'/__dispatch_table', handlers.debug.DispatchTableHandler),

    (r'/__config', handlers.debug.ConfigHandler),

    (r'/__apicache/(.*)$', handlers.debug.ApiCacheHandler),
    (r'/__apicache$', handlers.debug.ApiCacheHandler),
]

auth_handlers = [
    (r'/whoami$', handlers.auth.WhoamiHandler),

    (r'/recover/(.*)$', handlers.auth.RecoverHandler),
    (r'/activate/(.*)$', handlers.auth.ActivationHandler),

    (r'/login/facebook$', handlers.auth.FacebookLoginHandler),
    (r'/login/twitter$', handlers.auth.TwitterLoginHandler),
    (r'/login/google$', handlers.auth.GoogleLoginHandler),
    (r'/login$', handlers.auth.LoginHandler),

    (r'/logout$', handlers.auth.LogoutHandler),
]

api_handlers = [
    (r'/notifications/(.*)$', handlers.api.NotificationsHandler),
    (r'/notifications$', handlers.api.NotificationsHandler),

    (r'/mbping', handlers.api.MBPingHandler),

    (r'/datetime', handlers.api.ServerTimeHandler),

    (r'/redirect', handlers.api.ContentProxyHandler),

    (r'/statics/(.*)', tornado.web.StaticFileHandler, {'path': 'statics'}),

    (r'/search/users.json$', handlers.api.UserAutocomplete),

    (r'/my-data$', handlers.api.DataLiberation),

    (r'/beta-search$', handlers.api.BetaSearchHandler),

    (r'/search$', handlers.api.SearchHandler),

    (r'/list/(\w+)/cover-image', handlers.api.CoverImageHandler),

    (r'/notifications', handlers.api.FetchNotifications),

    (r'/landing/(\w+)$', handlers.api.LandingHandler),
    (r'/landing$', handlers.api.LandingHandler),

    (r'/user/(\w+)/profile-image$', handlers.api.ProfileImageHandler),
    (r'/user/profile-image$', handlers.api.ProfileImageHandler),
    (r'/user/(.*)$', handlers.api.UserHandler),

    (r'/profile/(.*)$', handlers.api.ProfileHandler),

    (r'/list/(.*)$', handlers.api.ListHandler),

    (r'/hyperdrive$', handlers.api.HyperdriveHandler),
    (r'/motherbrain$', handlers.api.MotherbrainHandler),

    (r'/$', handlers.api.WelcomeHandler, dict()),
]

tracker_handler = [
    (r'/tracker$', handlers.tracker.TrackerHandler)
]

monitor_handler = [
    (r'/status$', handlers.monitor.StatusHandler)
]

discovery_handler = [
    (r'/discovery', handlers.api.DiscoveryHandler),

    (r'/focuson/(.*)', handlers.api.FocusOnHandler),
    (r'/focuson', handlers.api.FocusOnHandler),

    (r'/popular$', handlers.api.PopularListHandler),

    (r'/toplists/(.*)$', handlers.api.TopListsHandler),
    (r'/toplists$', handlers.api.TopListsHandler),

    (r'/topusers/(.*)$', handlers.api.TopUsersHandler),
    (r'/topusers$', handlers.api.TopUsersHandler),

    (r'/followmore$', handlers.api.FollowMoreHandler),

    (r'/network/(.*?)/(.*)$', handlers.api.UserNetworkHandler),
    (r'/network/(.*)$', handlers.api.UserNetworkHandler),

    (r'/hashtag/(.*)$', handlers.api.HashtagHandler),
    (r'/hashtags$', handlers.api.HashtagsHandler),

    (r'/list-by-categories/(.*)$', handlers.api.FetchListByCategoryHandler),
    (r'/categories/(.*)$', handlers.api.FetchListByCategoryHandler),

    (r'/facebook-friends$', handlers.api.FacebookFriendsHandler),
    (r'/facebook-links$', handlers.api.FacebookLinksHandler),
]

handlers = api_handlers + tracker_handler + auth_handlers + monitor_handler + discovery_handler


def get_urls(settings):
    global handlers

    if settings.get('debug'):
        handlers += debug_handlers

    return handlers
