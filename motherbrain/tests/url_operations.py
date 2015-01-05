import unittest
import json
from itertools import chain

import motherbrain.models.operations
from motherbrain.models.operations import url


class TestOne(unittest.TestCase):
    def setUp(self):
        self.urls = [{'hash': 'Foo'},
                     {'hash': 'FOo'},
                     {'hash': 'FOO'},
                     {'hash': 'Bar'},
                     {'hash': 'BAr'},
                     {'hash': 'BAR'}]

        self.urls_with_pos = [{'hash': 'Foo', 'position': 1},
                              {'hash': 'FOo', 'position': 2},
                              {'hash': 'FOO', 'position': 3},
                              {'hash': 'Bar', 'position': 4},
                              {'hash': 'BAr', 'position': 5},
                              {'hash': 'BAR', 'position': 6}]

        self.urls_with_sec = [{'hash': 'Foo', 'position': 1, 'section': 1},
                              {'hash': 'FOo', 'position': 2, 'section': 1},
                              {'hash': 'FOO', 'position': 3, 'section': 3},
                              {'hash': 'Bar', 'position': 4, 'section': 3},
                              {'hash': 'BAr', 'position': 5, 'section': 2},
                              {'hash': 'BAR', 'position': 6, 'section': 3}]

    def test_add_with_position(self):
        urls = self.urls

        result = url.add(urls, 'foo-list', 'http://www.zombo.com', position=5)

        self.assertEqual(len(result), 7)
        self.assertEqual(result[4].get('url'),
                         'http://www.zombo.com')

    def test_add_with_position_with_section(self):
        urls = self.urls_with_sec

        result = url.add(urls, 'foo-list', 'http://www.zombo.com',
                         section=2, position=4)

        self.assertEqual(len(result), 7)
        self.assertEqual(result[3].get('url'),
                         'http://www.zombo.com')

    def test_add_without_position(self):
        urls = self.urls

        result = url.add(urls, 'foo-list', 'http://www.zombo.com')

        self.assertEqual(len(result), 7)
        self.assertEqual(result[0].get('url'),
                         'http://www.zombo.com')
        self.assertEqual(result[1].get('hash'), 'Foo')

    def test_add_with_position_without_section(self):
        urls = self.urls_with_sec

        result = url.add(urls, 'foo-list', 'http://www.zombo.com', position=3)

        self.assertEqual(len(result), 7)
        self.assertEqual(result[2].get('url'),
                         'http://www.zombo.com')
        self.assertEqual(result[3].get('hash'), 'FOO')


    def test_add_without_position_with_section(self):
        urls = self.urls_with_sec

        result = url.add(urls, 'foo-list', 'http://www.zombo.com', section=2)

        self.assertEqual(len(result), 7)
        self.assertEqual(result[4].get('url'),
                         'http://www.zombo.com')
        self.assertEqual(result[5].get('hash'), 'BAr')


    def testUpdatePosition(self):
        result = url.update_position(self.urls, 'FOO', None)
        expected = self.urls_with_pos

        self.assertEqual(expected, result)

    def testSortByPosition(self):
        reverse_urls = reversed(self.urls_with_pos)

        result = url.sort_by_position(reverse_urls)
        expected = self.urls_with_pos

        self.assertEqual(expected, result)

    def testSortBySection(self):
        result = url.sort_by_section(self.urls_with_sec)
        expected = [{'hash': 'Foo', 'position': 1, 'section': 1},
                    {'hash': 'FOo', 'position': 2, 'section': 1},
                    {'hash': 'BAr', 'position': 5, 'section': 2},
                    {'hash': 'FOO', 'position': 3, 'section': 3},
                    {'hash': 'Bar', 'position': 4, 'section': 3},
                    {'hash': 'BAR', 'position': 6, 'section': 3}]

        self.assertEqual(expected, result)

    def testSwapUrlMiddle(self):
        result = url.swap(self.urls_with_pos, 'FOO', 5)

        expected = [{'hash': 'Foo', 'position': 1},
                    {'hash': 'FOo', 'position': 2},
                    {'hash': 'BAr', 'position': 3},
                    {'hash': 'Bar', 'position': 4},
                    {'hash': 'FOO', 'position': 5},
                    {'hash': 'BAR', 'position': 6}]

        self.assertEqual(expected, result)

    def testPositionAndSection(self):
        _result = url.sort_by_section(self.urls_with_sec)
        result = url.update_position(_result)

        expected = [{'hash': 'Foo', 'position': 1, 'section': 1},
                    {'hash': 'FOo', 'position': 2, 'section': 1},
                    {'hash': 'BAr', 'position': 3, 'section': 2},
                    {'hash': 'FOO', 'position': 4, 'section': 3},
                    {'hash': 'Bar', 'position': 5, 'section': 3},
                    {'hash': 'BAR', 'position': 6, 'section': 3}]

        self.assertEqual(expected, result)

    def testSwapUrlTop(self):
        result = url.swap(self.urls_with_pos, 'FOO', 1)

        expected= [{'hash': 'FOO', 'position': 1},
                   {'hash': 'FOo', 'position': 2},
                   {'hash': 'Foo', 'position': 3},
                   {'hash': 'Bar', 'position': 4},
                   {'hash': 'BAr', 'position': 5},
                   {'hash': 'BAR', 'position': 6}]

        self.assertEqual(expected, result)

    def testSwapUrlBottom(self):
        result = url.swap(self.urls_with_pos, 'FOO', 6)

        expected= [{'hash': 'Foo', 'position': 1},
                   {'hash': 'FOo', 'position': 2},
                   {'hash': 'BAR', 'position': 3},
                   {'hash': 'Bar', 'position': 4},
                   {'hash': 'BAr', 'position': 5},
                   {'hash': 'FOO', 'position': 6}]

        self.assertEqual(expected, result)

    def testMoveUrlMiddle(self):
        result = url.move(self.urls_with_pos, 'FOO', 5)

        expected = [{'hash': 'Foo', 'position': 1},
                    {'hash': 'FOo', 'position': 2},
                    {'hash': 'Bar', 'position': 4},
                    {'hash': 'BAr', 'position': 5},
                    {'hash': 'FOO', 'position': 3},
                    {'hash': 'BAR', 'position': 6}]

        self.assertEqual(expected, result)

    def testMoveUrlTop(self):
        result = url.move(self.urls_with_pos, 'FOO', 1)

        expected = [{'hash': 'FOO', 'position': 3},
                    {'hash': 'Foo', 'position': 1},
                    {'hash': 'FOo', 'position': 2},
                    {'hash': 'Bar', 'position': 4},
                    {'hash': 'BAr', 'position': 5},
                    {'hash': 'BAR', 'position': 6}]

        self.assertEqual(expected, result)

    def testMoveUrlBottom(self):
        result = url.move(self.urls_with_pos, 'FOO', 6)

        expected = [{'hash': 'Foo', 'position': 1},
                    {'hash': 'FOo', 'position': 2},
                    {'hash': 'Bar', 'position': 4},
                    {'hash': 'BAr', 'position': 5},
                    {'hash': 'BAR', 'position': 6},
                    {'hash': 'FOO', 'position': 3}]

        self.assertEqual(expected, result)

    def testFetchFavicon(self):
        urls_to_test = [('http://www.reddit.com',
                         'http://www.redditstatic.com/favicon.ico'),

                        ('http://www.teslasociety.com/tesladay.htm',
                         'http://www.teslasociety.com/favicon.ico'),

                        ('http://www.lastfm.it/music/Al+Di+Meola',
                         'http://cdn.last.fm/flatness/favicon.2.ico'),

                        ('http://mozilla.org/',
                         'http://mozorg.cdn.mozilla.net/media/img/favicon.ico'),

                       ]

        for url_addr, favicon_addr in urls_to_test:
            result = url.fetch_favicon({'url': url_addr})
            self.assertEqual(result, favicon_addr)

    def test_exists(self):
        urls = [{'hash': 'Foo', 'url': 'http://foo.com'},
                {'hash': 'FOo', 'url': 'http://bar.co.uk'},
                {'hash': 'FOO', 'url': 'http://zombo.com'}]

        test_with = [('http://foo.com', True),
                     ('http://bar.com', False)]

        for uri, cond in test_with:
            _assert = self.assertTrue

            if not cond:
                _assert = self.assertFalse

            _assert(url.exists(urls, uri))


if __name__ == '__main__':
    unittest.main()
