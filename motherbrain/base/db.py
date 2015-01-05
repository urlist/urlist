import pymongo
import logging

from motherbrain.base.conf import get_config


default_opts = {
    'database': {
        'dbname':  {'default': 'urlist'},
        'dbhost':  {'default': 'mongo1'},
        'dbport':  {'default': 27017, 'type': int},
        'dbusr':   {'default': ''},
        'dbpwd':   {'default': ''},
    }
}

default_settings = get_config(default_opts)


def connect(options=default_settings):
    dbconn_args = {'port': options.getint('database', 'dbport'),
                   'host': options.get('database', 'dbhost')}

    dbconn = pymongo.Connection(**dbconn_args)

    return dbconn


def get_db(options=default_settings):
    dbconn = connect(options)

    db = getattr(dbconn, options.get('database', 'dbname'))

    dbauth_args = {'name': options.get('database', 'dbusr'),
                   'password': options.get('database', 'dbpwd')}

    if (any(dbauth_args.values())):
        db.authenticate(**dbauth_args)

    return db


class DBConnection(object):
    _shared_state = {}

    def __init__(self, settings):
        self.__dict__ = self._shared_state

        self.settings = settings
        self._connection = None

    def connect(self):
        if not self._connection:
            logging.info("""DBCONN --- '{dbname}' at {dbhost}:{dbport}"""
                         """""".format(**dict(self.settings.items('database'))))

            self._connection = get_db(self.settings)

        return self._connection

    def __repr__(self):
        opts = dict(self.settings.items('database'))

        return u"Database '{}' at {}:{}".format(opts.get('dbname'),
                                              opts.get('dbhost'),
                                              opts.get('dbport'))
