import datetime
import time
import json

from motherbrain.api_server.go import GoHandler

from datetime import timedelta

from motherbrain.api_server.handlers import UrlistHandler, _json
from motherbrain.api_server.handlers.api import UrlistContextMixin

from tornado import gen
from tornado.web import authenticated, asynchronous
from tornado.httputil import parse_body_arguments
from tornado.httpclient import AsyncHTTPClient, HTTPRequest

from bson.objectid import ObjectId

from motherbrain.com.messages import MBMessage


class ConfigHandler(UrlistHandler):
    def get(self):
        opts = dict(self.user_options.items('server'))

        self.write(json.dumps(opts))


class MotherbrainMessenger(UrlistHandler, UrlistContextMixin):
    @authenticated
    def get(self, dispatcher_id=None):
        dispatcher = self.application.settings.get('dispatcher')
        tmpl = 'debug/motherbrain-messenger.html'

        if dispatcher_id:
            dispatcher_id = int(dispatcher_id)

        cluster_data = dispatcher.cluster_data.get(dispatcher_id)
        cluster_actions = {}
        metrics = {}

        if cluster_data:
            cluster_actions = cluster_data.values()[0].get('actions', [])

            metrics = {addr: data.get('metrics', {}).get('avg-dispatch-time')
                       for addr, data in cluster_data.iteritems()}

        self.render(tmpl, clusters=dispatcher.cluster_dispatchers,
                          actions=cluster_actions,
                          metrics=metrics,
                          dispatcher_id=dispatcher_id)

    @asynchronous
    @authenticated
    @gen.engine
    def post(self, dispatcher_id=None):
        form = {}
        parse_body_arguments('application/x-www-form-urlencoded',
                             self.request.body, form, {})

        _payload = form.get('payload', ['']).pop()
        action = form.get('action', ['']).pop()

        payload = json.loads(_payload)

        dispatcher = self.application.settings.get('dispatcher')

        resp = yield gen.Task(dispatcher.send_msg, action,
                                                   payload,
                                                   self.context())

        self.write(resp.payload)
        self.finish()


class RetrieveHandler(UrlistHandler, UrlistContextMixin):
    @authenticated
    def get(self):
        import requests

        url = self.get_argument('url', False)
        user_agent = self.request.headers.get('User-Agent')

        req = requests.requests.get(url)

        self.write(req.content)

        self.finish()


class DispatchTableHandler(UrlistHandler, UrlistContextMixin):
    def get(self):
        data = {k: [{k1: len(v1) for k1, v1 in v._dispatch_table.iteritems()}]
                for k, v in self.dispatcher.cluster_dispatchers.iteritems()}

        self.write(json.dumps(data, indent=4))


class MotherbrainQueryStringMessenger(UrlistHandler, UrlistContextMixin):
    @asynchronous
    @authenticated
    @gen.engine
    def get(self, action):
        args_as_list = self.request.arguments

        payload = {k: v[0] for k, v in args_as_list.iteritems()}

        api_msg = MBMessage(None, action, {}, payload, self.context())

        go = GoHandler.can_handle(self, api_msg)

        if go:
            raw_resp = yield go.dispatch()
            resp = go.make_response(raw_resp)
        else:
            resp = yield self.dispatch(api_msg)

        self.write(resp.payload)
        self.finish()


class ApiCacheHandler(UrlistHandler, UrlistContextMixin):
    @authenticated
    def get(self, doc_id=None):
        tmpl = 'debug/apicache-explorer.html'

        if doc_id:
            data = self.db.apicache.find_one({'_id': ObjectId(doc_id)})

            self.set_header('Content-Type', 'application/json')
            self.write(data.get('message'))
        else:
            api_data = self.db.apicache.find()

            self.render(tmpl, api_data=api_data)
