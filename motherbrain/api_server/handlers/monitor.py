import json

import tornado.web


class StatusHandler(tornado.web.RequestHandler):
    def get(self):
        dispatcher = self.application.settings.get('dispatcher')

        if hasattr(dispatcher, 'cluster_data'):
            data = json.dumps(dispatcher.status())
        else:
            resp = dispatcher.send_msg('admin:status', {}, {})
            data = resp_payload

        self.write(data)
