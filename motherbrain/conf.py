import os
import json
import datetime

import logging

import motherbrain.base.db

from itertools import chain

from motherbrain.base import conf
from motherbrain.base.conf import get_config
from motherbrain.com.dispatchers import MBDispatcherCluster

ROOT = os.path.realpath(os.path.dirname('./'))

SITE_CONF = conf.site_conf(os.getcwd())

if SITE_CONF:
    logging.info('CONF::SITE --- Read')

DATADIR = SITE_CONF.get('env.data_root', '/tmp')
API_URL = SITE_CONF.get('env.api_url')
WEBCLIENT_URL = SITE_CONF.get('env.webclient_url')

resources_opts = {
    'database': {
        'dbname':  {'default': 'urlist'},
        'dbhost':  {'default': 'mongo1'},
        'dbport':  {'default': 27017, 'type': int},
        'dbusr':   {'default': ''},
        'dbpwd':   {'default': ''},
    },

    'env': {
            'api_root': {'default': API_URL },
            'datadir': {'default': os.path.join(DATADIR, 'motherbrain_data')},
            'root': ROOT,
            'templates': os.path.join(ROOT, 'templates'),
            'static_url': {'default': 'http://static.urli.st'},
    },

    'queue': {
        'addresses': {'default': '''tcp://localhost:6555 tcp://localhost:6556''',
                      'help': 'A space separated list of addresses'},
    },

    'oauth': {
        'urlist_salt': {'default': 'XXX'}
    }
}

workers_opts = {
    'workers': {
        'permissions_file': {'default': os.path.join(ROOT,
                             'workers', 'actions', 'permissions.json')}
    }
}

def dump():
    def get_child(data):
        if isinstance(data, dict):
            return data.get('default')

        return data

    data = {kx: {ky: get_child(vy) for ky, vy in vx.iteritems()}
            for kx, vx in resources_opts.iteritems()}

    with open("/tmp/mbconf.json", 'w') as f:
        now = datetime.datetime.now()

        f.write(u"--- {}\n".format(now))
        f.write(json.dumps(data, indent=4))

def get_settings(extra_options=None):
    if not extra_options:
        extra_options = {}

    _extra_items = list(chain(extra_options.iteritems(),
                              workers_opts.iteritems()))

    opts = dict(resources_opts, **dict(_extra_items))

    return get_config(opts)

def get_db(settings):
    return motherbrain.base.db.DBConnection(settings).connect()


def get_queue(settings):
    addrs = settings.get('queue', 'addresses').split(' ')
    return MBDispatcherCluster(addrs)


def is_production():
    return conf.is_production(ROOT)

