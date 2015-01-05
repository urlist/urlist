import os
import codecs
import string
from subprocess import Popen, PIPE

import time

class CacheBuster(object):
    start_time = int(time.time())

    @property
    def virtualname(self):
        return u'?'.join([self.path.replace(self.root, self.virtualroot, 1), str(self.start_time)])


class Resource(object):
    start_time = int(time.time())

    def __init__(self, path, root='.', virtualroot='.', subroot=None, pre_filename=''):
        self.path         = path
        self.root         = root
        self.virtualroot  = virtualroot
        self.subroot      = subroot
        self.pre_filename = pre_filename

    @property
    def virtualname(self):
        base, filename = os.path.split(self.path)

        if self.pre_filename:
            filename = '.'.join((self.pre_filename, filename))

        base = base.replace(self.root, self.virtualroot, 1)

        return '{0}/{1}?{2}'.format(base, filename, str(self.start_time))

    def as_html(self):
        return self.TMPL.format(filename=self.virtualname)

    def as_text(self):
        content = codecs.open(self.path, 'r', 'utf-8').read()
        return content


class JavascriptResource(Resource):
    TMPL = u'<script src="{filename}" type="text/javascript"></script>'

class CssResource(Resource):
    TMPL = u'<link href="{filename}" rel="stylesheet" />'

class LessResource(Resource):
    TMPL = u'<link href="{filename}" rel="stylesheet/less" />'

    def as_text(self):
        return ''

class HandlebarsResource(Resource):
    TMPL = u'TEMPLATES["%s"] = Handlebars.compile("%s");'

    def as_html(self):
        name = os.path.splitext(self.path[len(self.subroot) + 1:])[0]
        content = codecs.open(self.path, 'r', 'utf-8').read()
        content = content.replace('"', '\\"')
        content = u' '.join(map(string.lstrip, filter(bool, content.split('\n'))))
        content = self.TMPL % (name, content)
        return content

    def as_text(self):
        return self.as_html()


class ResourceSet(Resource):
    TMPL = u'<!-- resources for: {path} -->'

    def walk(self):
        for dirpath, dirnames, filenames in os.walk(self.path):
            matched = [f for f in filenames if f.endswith(self.extension)]
            for filename in matched:
                fullfilename = os.path.join(dirpath, filename)

                resource = self.Resource(
                    fullfilename,
                    self.root,
                    self.virtualroot,
                    self.path,
                    pre_filename=self.pre_filename)

                yield resource


    def as_html(self):
        buffer = [ self.TMPL.format(path=self.path) ]

        for resource in self.walk():
            buffer.append(resource.as_html())

        return u'\n'.join(buffer)

    def as_text(self):
        buffer = [ ]

        for resource in self.walk():
            buffer.append(resource.as_text())

        return u'\n'.join(buffer)


class JavascriptResourceSet(ResourceSet):
    Resource = JavascriptResource
    extension = '.js'

class LessResourceSet(ResourceSet):
    Resource = LessResource
    extension = '.less'

    def as_text(self):
        return ''

class HandlebarsResourceSet(ResourceSet):
    Resource = HandlebarsResource
    extension = '.html'

    def as_html(self):
        TMPL = u'<script>{code}</script>'
        code = ResourceSet.as_html(self)
        return TMPL.format(code=code)



class Application(object):
    def as_html(self):
        pass


class Region(Resource):
    def __init__(self, *args, **kwargs):
        super(Region, self).__init__(*args, **kwargs)

    def walk(self):
        for dirpath, Resource in self.mapping:
            fullpath = os.path.join(self.path, dirpath)
            resource = Resource(fullpath, self.root, self.virtualroot, pre_filename=self.pre_filename)
            yield resource

    def as_html(self):
        buffer = []
        for resource in self.walk():
            buffer.append(resource.as_html())

        return u'\n'.join(buffer)

    def as_text(self):
        buffer = []
        for resource in self.walk():
            buffer.append(resource.as_text())

        return u'\n'.join(buffer)


class JavascriptRegion(Region):
    def as_text(self):
        code = super(JavascriptRegion, self).as_text()
        p = Popen(['uglifyjs', '--lift-vars', '--no-copyright'], stdin=PIPE, stdout=PIPE)
        out, _ = p.communicate(code.encode('utf-8'))
        return out.decode('utf-8')


class LessRegion(Region):
    def as_text(self):
        out = []
        for resource in self.walk():
            p = Popen(['lessc', resource.path, '-x', '-ns'], stdout=PIPE)
            out.append(p.communicate()[0])
        return u'\n'.join(out)


class Page(object):
    HTML_TMPL = u"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Urlist</title>
    {resources}
</head>

<body>

</body>
"""
    def __init__(self, application):
        self.application = application

    def as_html(self):
        resources = self.application.as_html()
        return self.HTML_TMPL.format(resources=resources)

class TestPage(Page):
    HTML_TMPL = u"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Urlist</title>
    {resources}
</head>

<body>
    <div id="qunit"></div>
    <div id="qunit-fixture"></div>
</body>
"""

