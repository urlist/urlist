import tornado.web

class ResourceHandler(tornado.web.RequestHandler):
    def initialize(self, loader):
        self.loader = loader

    def get(self, page_name):
        template_name = 'resources/{}.html'.format(page_name)
        template = self.loader.load(template_name)
        html = template.generate()
        self.write(html)

