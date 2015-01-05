import os
import sys
import json
import logging
import datetime

from tornado.web import authenticated, HTTPError

from tornado.httputil import parse_body_arguments

from motherbrain.api_server.handlers import UrlistHandler, \
                                            smart_user_id, \
                                            _json

from bson.objectid import ObjectId


class UrlistContextMixin(object):
    def context(self, new_context={}):
        c = {'visit_collection_name': 'visit',
             'current_user_id': str(self.current_user.get('_id')),
             'base_url': 'http://urli.st/'}

        return dict(c, **new_context)


class WelcomeHandler(UrlistHandler):
    def get(self):
        self.write('Knock, Knock...')


class TrackerHandler(UrlistHandler, UrlistContextMixin):
    @authenticated
    def post(self):
        tracker = self.db.tracker

        current_user = self.current_user

        body = self.request.body
        req_data = json.loads(body)

        now = datetime.datetime.now()

        make_cohort = lambda x: '{0}-{1:02}'.format(x[0], x[1])

        iso_now = now.isocalendar()
        cohort_action = make_cohort(iso_now)

        user_ctime = current_user.get('creation_time').isocalendar()
        cohort_user = make_cohort(user_ctime)

        data = dict(req_data, **{'user_id': self.context().get('current_user_id'),
                                 'ts': now,
                                 'is_anonymous': current_user.get('is_anonymous'),
                                 'action_cohort_id': cohort_action,
                                 'user_cohort_id': cohort_user})

        tracker.insert(data)

        inc = lambda list_hash: self.db.urlists.update({'hash': list_hash},
                                                       {'$inc': {'views_amount': 1}})

        if all([data.get('model') == 'list',
                data.get('target'),
                data.get('tracker') == 'view']):

            inc(data.get('target'))

        elif all([data.get('model') == 'url',
                  data.get('target'),
                  data.get('tracker') == 'view']):

            try:
                inc(data.get('target').split('/')[0])
            except:
                logging.warning('Cannot increase views amount for {target}'.format(**data))

        self.write("")

    def options(self, *args, **kwargs):
        """Needed for Cors PreFlight request"""
        self.write('')


