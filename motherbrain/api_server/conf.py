import os
import logging

import tornado.options as opt

from motherbrain.base import conf
from motherbrain.base.conf import get_config

SITE_CONF = conf.site_conf(os.getcwd())
DATADIR = SITE_CONF.get('env.motherbrain_data', '/tmp')
API_URL = SITE_CONF.get('env.api_url')
WEBCLIENT_URL = SITE_CONF.get('env.webclient_url')

_srv_opts = {
    'config': {'default': 'api_server.cfg',
               'help': 'Configuration File'},

    'port':   {'default': 8888, 'type': int,
               'help': 'Tornado Port'},

    'debug':  {'default': True, 'type': bool},

    'cors_hosts':      {'default': '''http://api.urli.st '''
                                   '''http://urli.st '''
                                   '''http://localhost:9999 '''
                                   '''http://next.urli.st '''
                                   '''http://urli.st '''
                                   '''http://next.api.urli.st''',
                        'help': 'Hosts allowed to perform Cross Domain Request'},

    'media_path': {'default': os.path.join(DATADIR, 'urlist_media')},
    'media_url': {'default': '/media'},

    'static_url': {'default': 'http://static.urli.st'},

    'base_url': {'default': API_URL},
    'webclient_url': {'default': WEBCLIENT_URL}
}

_motherbrain_opts = {
    'dispatcher_classname': {'default': 'MBDispatcherCluster',
                             'help': 'Motherbrain dispatcher class'},

    'addresses': {'default': '''tcp://localhost:5555 tcp://localhost:5556 '''
                             '''tcp://localhost:5557 tcp://localhost:5558''',
                  'help': 'A space separated list of addresses'},

    'datadir': {'default': os.path.join(DATADIR, 'motherbrain_data')}
}

_oauth_opts = {
    'cookie_secret':   {'default': 'XXX'},
    'cookie_domain':   {'default': SITE_CONF.get('oauth.cookie_domain')},

    'facebook_secret': {'default': 'XXX'},
    'facebook_api_key': {'default': 'XXX'},
    'facebook_redirect_uri': {'default': '{}/login/facebook'.format(API_URL)},

    'twitter_consumer_key': {'default': 'XXX'},
    'twitter_consumer_secret': {'default': 'XXX'},

    'urlist_salt': {'default': 'XXX'}
}

_db_opts = {
    'dbname':  {'default': 'urlist'},
    'dbhost':  {'default': 'mongo1'},
    'dbport':  {'default': 27017, 'type': int},
    'dbusr':   {'default': ''},
    'dbpwd':   {'default': ''},
}

# Get Tornado default options
_tornado_opts = {k: v.value() for k, v in opt.options.iteritems()}

_options = {'server': _srv_opts,
            'database': _db_opts,
            'tornado': _tornado_opts,
            'oauth': _oauth_opts,
            'motherbrain': _motherbrain_opts}

_cli_args = {'server': ['port', 'debug', 'config'],
             'motherbrain': ['datadir']}

config = get_config(_options, _cli_args)

if SITE_CONF:
    logging.info('CONF::SITE --- Read')
