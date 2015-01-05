import os
import json
import tornado.ioloop
import tornado.web
import tornado.template

from tornado import autoreload

import handlers.app
import handlers.resource
import handlers.bookmarklet
import handlers.test
import handlers.resource
import handlers.redirect
import mapping

import conf
import logging

import requests

ROOT = os.path.dirname(__file__)


def get_api_options(api_root):
    api_root = api_root.rstrip('/')

    if not api_root.startswith("http:"):
        api_root = "http:{}".format(api_root)

    url = '{}/__config'.format(api_root)

    try:
        r = requests.get(url)
    except:
        logging.warning("Cannot fetch config")

        return None

    try:
        return r.json()
    except TypeError:
        logging.warning("Cannot parse config")
        return None

srv_opts = {
    'port':   {'default': 80, 'help': 'Port'},
    'debug':  {'default': True, 'help': 'Debug mode'},
    'config': {'default': os.path.join(ROOT, '..', 'development.ini'),
               'help': 'Configuration File'},
    'cookie_secret': {},
    'static_path': {'default': '../src'},
    'template_path': {'default': 'templates'},
    'root': {'default': os.path.join(ROOT, '../src')},
    'api_root': {'default': '//localhost:8888'},
    'client_root': {'default': '//localhost:9999'},
    'mapper': {'default': 'standalone'},
}

options = conf.get_options(srv_opts, cli_args=True)
api_options = get_api_options(options.api_root)

settings = dict(debug=options.debug,
                cookie_secret=options.cookie_secret,
                gzip=True,
                options=options)


loader = tornado.template.Loader(options.template_path)

logging.info("Reading configuration from '{0}'".format(options.config))

handlers = [
    (r'/fb/(.*)', tornado.web.StaticFileHandler, {'path': 'templates'}),

    (r'/static/(.*)', tornado.web.StaticFileHandler, {'path': options.static_path}),

    (r'/_resources/(.*)', handlers.resource.ResourceHandler, dict(loader=loader)),

    (r'/bookmarklet/add$', handlers.app.AppHandler, dict(
        app='Bookmarklet',
        loader=loader,
        options=options,
        api_root=options.api_root)),

    (r'/(.*)$', handlers.app.AppHandler, dict(
        app='Main',
        loader=loader,
        options=options,
        api_root=options.api_root))
]

if api_options:
    media_handler = (r'{}/(.*)'.format(api_options.get('media_url')),
                     tornado.web.StaticFileHandler,
                     {'path': api_options.get('media_path')})

    handlers.insert(0, media_handler)
else:
    logging.warning("Missing api options")

application = tornado.web.Application(handlers, **settings)

if __name__ == '__main__':
    application.listen(options.port)
    ioloop = tornado.ioloop.IOLoop.instance()
    autoreload.start(ioloop)
    ioloop.start()

