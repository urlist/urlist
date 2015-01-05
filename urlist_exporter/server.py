from pymongo import MongoClient
import tornado.ioloop
import tornado.web 
from tornado.options import define, options

from bson.objectid import ObjectId

define('port', default=8888, help='run on the given port', type=int)

client = MongoClient()
db = client.urlist

class MainHandler(tornado.web.RequestHandler):

    def add_lists(self, query):
        for l in db.urlists.find(query):
            self.lists[l['hash']] = l

    def prepare(self):
        oid = ObjectId(self.get_secure_cookie('oauth_user_id'))
        self.user = db.users.find_one({'_id': oid})

        if not self.user:
            raise tornado.web.HTTPError(404)

        self.lists = {}

        self.add_lists({'user_id': str(oid)})
        self.add_lists({'followers': str(oid)})
        self.add_lists({'contributors.user_id': str(oid)})

    def get(self):
        self.set_header('Content-Disposition', 'attachment; filename="urlist.html"')
        self.render('links.html', user=self.user, lists=self.lists)


application = tornado.web.Application([
    (r'/goodbye', MainHandler),
], cookie_secret='XXX')

if __name__ == '__main__':
    tornado.options.parse_command_line()
    application.listen(options.port)
    tornado.ioloop.IOLoop.instance().start()

