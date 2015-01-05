import tornado.web
import mapping


app_mappers = {
    'dev' : mapping.UrlistDev,
    'prod': mapping.UrlistProd
}


class AppHandler(tornado.web.RequestHandler):

    def initialize(self, app, loader, options, api_root):
        self.template = loader.load('main.html')
        self.options = options
        self.mapping = self.get_app_mapping()
        self.api_root = api_root
        self.app = app

    def get_app_mapping(self):
        current_mapping = self.get_cookie('ul.config.environment')
        custom_branch   = self.get_cookie('ul.config.branch') or ''

        if current_mapping not in app_mappers:
            current_mapping = self.options.mapper

        if custom_branch == 'master':
            custom_branch = ''

        return app_mappers[current_mapping](
            self.options.root,
            self.options.root,
            virtualroot='/static',
            pre_filename=custom_branch)

    def get(self, url=None):
        resources = self.mapping.as_html()

        html = self.template.generate(
            resources=resources,
            api_root=self.api_root,
            app=self.app)

        self.write(html)

