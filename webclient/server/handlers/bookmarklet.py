import tornado.web

class BookmarkletHandler(tornado.web.RequestHandler):
    def initialize(self, loader, mapping, api_root):
        self.template = loader.load('main.html')
        self.mapping = mapping
        self.api_root = api_root
        self.loader = 'Bookmarklet'

    def get(self):
        resources = self.mapping.as_html()

        html = self.template.generate(
            resources=resources,
            api_root=self.api_root,
            loader=self.loader)

        self.write(html)

