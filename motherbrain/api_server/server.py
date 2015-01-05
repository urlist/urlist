import os
import logging

import tornado.web

import conf

from zmq.eventloop import ioloop
ioloop.install()

from motherbrain.base import db
from motherbrain.api_server import dispatcher
from motherbrain.api_server import urls

from motherbrain.api_server.cloudsync import CloudSync


#
# User Settings
#
user_settings = conf.config

ROOT = os.path.dirname(__file__)
PORT = user_settings.get('server', 'port')
DEBUG = user_settings.get('server', 'debug')
BASE_URL = user_settings.get('server', 'base_url')
MEDIA_PATH = user_settings.get('server', 'media_path')

logging.info('CONF::MEDIA_PATH --- {}'.format(MEDIA_PATH))

oauth_settings = {k: v for k, v in user_settings.items('oauth')}

if DEBUG:
    logging.basicConfig(level=logging.DEBUG)
    logging.info('APISRV --- DEBUG MODE')


#
# Database
#
db = db.get_db(user_settings)

#
#
#
cloudsync = CloudSync()

#
# Motherbrain Dispatchers
#
dispatcher = dispatcher(user_settings.get('motherbrain', 'dispatcher_classname'),
                        user_settings.get('motherbrain', 'addresses'))

#
# System wide settings
#
settings = dict(debug=DEBUG,
                template_path=os.path.join(ROOT, "templates"),
                login_url= '{}/login'.format(BASE_URL, 'login'),
                options=user_settings,
                dispatcher=dispatcher,
                db=db,
                gzip=True,
                cloudsync=cloudsync,
                **oauth_settings)


#
# Application initialization
#
class UrlistApplication(tornado.web.Application):
    def log_request(self, handler):
        if "log_function" in self.settings:
            self.settings["log_function"](handler)
            return
        if handler.get_status() < 400:
            log_method = logging.info
        elif handler.get_status() < 500:
            log_method = logging.warning
        else:
            log_method = logging.error
        request_time = 1000.0 * handler.request.request_time()

        headers = handler.request.headers

        remote_ip = headers.get('X-Forwarded-For',headers.get(
            'X-Real-Ip', handler.request.remote_ip))

        log_method("%s --- %d %s %.2fms", remote_ip,
                                          handler.get_status(),
                                          handler._request_summary(),
                                          request_time)

handlers = urls.get_urls(settings)


# temporary hack to have media_url
handlers.insert(0,
    (r'{}/(.*)'.format(user_settings.get('server', 'media_url')),
        tornado.web.StaticFileHandler, {'path': MEDIA_PATH}))

application = UrlistApplication(handlers, **settings)


def _clean_shutdown(signum, frame):
    import sys

    signame, = [x for x in dir(signal)
                if getattr(signal, x) == 15 and x.startswith('SIG')]

    logging.info('APISRV::SHUTDOWN --- {}'.format(signame))

    dispatcher.close()

    sys.exit(0)


if __name__ == '__main__':
    import signal

    signal.signal(signal.SIGTERM, _clean_shutdown)
    signal.signal(signal.SIGINT, _clean_shutdown)

    application.listen(PORT, no_keep_alive=True)
    logging.info("APISRV::LISTENING --- {}".format(PORT))

    ioloop = ioloop.IOLoop.instance()
    ioloop.start()
