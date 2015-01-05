import tornado.web

class TestHandler(tornado.web.RequestHandler):
    def initialize(self, loader, mapping):
        self.template = loader.load('test.html')
        self.mapping = mapping

    def get(self):
        resources = self.mapping.as_html()
        html = self.template.generate(resources=resources)
        self.write(html)

