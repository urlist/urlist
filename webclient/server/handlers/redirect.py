import tornado.web
import tornado.escape

class RedirectHandler(tornado.web.RequestHandler):

    def initialize(self, client_root, api_root):
        self.client_root = client_root
        self.api_root = api_root

    def get(self):
        url = ''.join([ self.api_root,
                        '__impersonate/urlist',
                        '?next=',
                        tornado.escape.url_escape(self.client_root) ])

        self.redirect(url)

