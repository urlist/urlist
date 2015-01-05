# -*- coding: utf-8 -*-
import unittest

import slugify

from motherbrain.base.models.processors import Transform as T
from motherbrain.base.models.processors import Compose as C

from motherbrain.base.models import Processor, \
                              UnknownProcessor, \
                              Field, \
                              Model, \
                              Collection


def full_url(slug, base_url):
    import urlparse

    return urlparse.urljoin(base_url, slug)


class Transform(object):
    class Square(T):
        def _transform(self):
            return self.value * self.value

    class DoNothing(T):
        def _transform(self):
            return self.value

    class ToInt(T):
        def _transform(self):
            return int(self.value)

    class Capitalize(T):
        def _transform(self):
            return self.value.title()

    class Uppercase(T):
        def _transform(self):
            return self.value.upper()


class TestProcessor(unittest.TestCase):
    def setUp(self):
        pass

    def testExceptions(self):
        p = Processor(None)
        self.assertRaises(UnknownProcessor, p, None)

    def testTransform(self):
        p = Processor(Transform.DoNothing)
        self.assertEqual(p(value=2), 2)

        p = Processor(Transform.Square)
        self.assertEqual(p(value=2), 4)

    def testCompose(self):
        p = Processor(C('foo', 'bar', using=lambda nums: sum(nums)))
        data = {'foo': 5, 'bar': 4}

        self.assertEqual(p(model_data=data), 9)

    def testComposeWithContextProcessor(self):
        data = {'slug': 'foobar'}
        context = {'base_url': 'http://interwebz.com'}

        p = Processor(C('slug', using=full_url))

        self.assertEqual(p(model_data=data, context=context),
                           'http://interwebz.com/foobar')


class TestField(unittest.TestCase):
    def testMultiTransform(self):
        f = Field('foo', [Transform.ToInt, Transform.Square], '2')

        self.assertEqual(f(), 4)

    def testCompose(self):
        f = Field('mult',
                  [C('foo', 'bar', using=lambda x: x[0] * x[1])], None)

        model_data = {'foo': 2, 'bar': 4}

        self.assertEqual(f(model_data), 8)

    def testComposeAndTransform(self):
        f = Field('mult',
                  [C('foo', 'bar', using=lambda x: x[0] * x[1]),
                   Transform.Square], None)

        model_data = {'foo': 2, 'bar': 4}

        self.assertEqual(f(model_data), 64)

    def testFieldWithCollection(self):
        class FooModel(Model):
            fields = (('foo', Transform.DoNothing),
                      ('bar', Transform.Square))

        class FooCollection(Collection):
            def __init__(self, data, *args, **kwargs):
                super(FooCollection, self).__init__(FooModel, data, *args, **kwargs)

        class BarModel(Model):
            fields = (('foos', FooCollection),
                      ('buus', Transform.DoNothing))

            def __init__(self, model_data):
                super(BarModel, self).__init__(self.fields, model_data)

        collection_data = [{'foo': 2, 'bar': 4}, {'foo': 3, 'bar': 5}]
        model_data = {'foos': collection_data, 'buus': 'Hi!'}

        model = BarModel(model_data)

        expected_results = {'foos': [{'foo': 2, 'bar': 16},
                                     {'foo': 3, 'bar': 25}],
                            'buus': 'Hi!'}

        self.assertEqual(model(), expected_results)


class TestModel(unittest.TestCase):
    def testModel(self):
        def make_name(name_data):
            name_data.reverse()
            return ', '.join(name_data)

        fields = (('first_name', Transform.Capitalize),
                  ('last_name', Transform.Capitalize),
                  ('display_name', C('first_name', 'last_name',
                                     using=make_name)))

        data = {'first_name': 'walter',
                'last_name': 'bishop'}

        model = Model(fields, data)

        expected_results = {'first_name': 'Walter',
                            'last_name': 'Bishop',
                            'display_name': 'Bishop, Walter'}

        self.assertEqual(model(), expected_results)

    def testModelWithContext(self):
        fields = (('title', Transform.DoNothing),
                  ('slug', C('title', using=lambda x: slugify.slugify(x))),
                  ('url', C('slug', using=full_url)),
                  ('protocol', [C('url', using=lambda x: x.partition(':')[0]),
                                Transform.Uppercase]))

        data = {'title': u'Gesundbrunned Über Alles'}

        model = Model(fields, data)
        context = {'base_url': 'http://foobar.com'}

        expected_results = {'title': u'Gesundbrunned Über Alles',
                            'slug': 'gesundbrunned-uber-alles',
                            'url': 'http://foobar.com/gesundbrunned-uber-alles',
                            'protocol': 'HTTP'}

        self.assertEqual(model(context), expected_results)

    def testCollection(self):
        class FooModel(Model):
            fields = (('foo', Transform.DoNothing),
                      ('bar', Transform.Square))

        data = [{'foo': 2, 'bar': 4}, {'foo': 3, 'bar': 5}]

        collection = Collection(FooModel, data)

        expected_results = [{'foo': 2, 'bar': 16}, {'foo': 3, 'bar': 25}]

        self.assertEqual(collection(), expected_results)


if __name__ == '__main__':
    unittest.main()
