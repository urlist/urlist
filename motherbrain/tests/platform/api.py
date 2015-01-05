import unittest
import pymongo
import subprocess
import json

import requests

from bson.objectid import ObjectId
from motherbrain.api_server.conf import config
from motherbrain.com.messages import MBMessage


api_url = config.get('server', 'base_url')

db = pymongo.Connection()

def create_token(db):
    db.api.update({'token': '8d7a903c-5b09-4434-b3b3-d0fa98496cdd'},
                  {'$set':  {'_id': ObjectId('5134a646ee382f0bd7899958'),
                             'user_id': ObjectId('5005f202ee9985409c000000')}},
                             upsert=True)

def init_db():
    for collection in ['users', 'urlists']:
        rc = subprocess.call(['mongoimport', '-d', 'urlist_test', '--drop',
                            '-collection', collection,
                            '--file', 'fixtures/{}.json'.format(collection)])

        if not rc == 0:
            raise Exception('Cannot initialize test database.')

    create_token(db.urlist_test)


class UrlistListTest(unittest.TestCase):
    def setUp(self):
        init_db()
        self.db = db['urlist_test']

        try:
            r = requests.get('/'.join([api_url]))
        except requests.ConnectionError:
            raise Exception('Cannot connect to API SERVER.')

    def _cookies(self):
        return  {'urlist_api_token': '8d7a903c-5b09-4434-b3b3-d0fa98496cdd'}

    def _test_fields(self, fields, data):
        for field_test in fields:
            if isinstance(field_test, (tuple, list)):
                field_name, field_test = field_test
            else:
                field_name, field_test = (field_test, lambda data, x: x)

            field_value = data.get(field_name)
            result = field_test(data, field_value)

            self.assertTrue(result)

    def _mb_msg(self, action, cookies, list_hash, **kwargs):
        payload = ["test01", action, {'list_hash': list_hash},
                   kwargs, {}]

        url = '/'.join([api_url, 'motherbrain'])

        r = requests.post(url, data=json.dumps(payload), cookies=cookies)

        return MBMessage(r.content)

    def _add_url(self, *args, **kwargs):
        return self._mb_msg('add-url', *args, **kwargs)

    def _move_url(self, *args, **kwargs):
        return self._mb_msg('move-url', *args, **kwargs)

    def _relist_url(self, *args, **kwargs):
        return self._mb_msg('relist-url', *args, **kwargs)

    def _assert_anon_cannot_modify_list(self, list_action, url):
        args, _ = url

        resp = list_action(*args)

        self.assertEqual(resp.action, 'OperationalError')
        self.assertEqual(resp.payload, 'PermissionDenied')

        return

    def _test_list_action(self, anonymous, cookies,
                          list_hash, test_urls, action_call):
        if anonymous:
            return self._assert_anon_cannot_modify_list(action_call, test_urls[0])

        positions = []

        for args, pos in test_urls:
            if pos == -1:
                continue

            action_call(*args)
            positions.append((args[0], pos))

        list_data = self.test_fetch_list(list_hash=list_hash)
        urls = list_data.get('urls')

        def _test(url, position, section=0):
            matching_urls = [x for x in urls if x.get('url') == url]

            self.assertNotEqual(len(matching_urls), 0)

            url = matching_urls[0]

            self.assertEqual(url.get('position'), position)
            self.assertEqual(url.get('section'), section)

        [_test(*args) for args in positions]

        return urls


class TestList(UrlistListTest):
    def test_fetch_list(self, list_hash='Yyc'):
        """Fetch a list and check for data consistency."""
        url = '/'.join([api_url, 'list', list_hash])

        r = requests.get(url)

        data = r.json()

        fields = ['hash', 'user_id',
                 ('links_amount', lambda data, x: x == len(data.get('urls', []))),
                 ('title', lambda data, x: x )]

        self._test_fields(fields, data)

        return data

    def test_add_list_as_anonymous(self):
        """Anonymous users cannot create new lists."""
        self.test_add_list(anonymous=True)

    def test_add_list(self, anonymous=False):
        """Create a new list."""
        url = '/'.join([api_url, 'motherbrain'])

        payload = ["test01", "add-list", {},
                  {"title": "Test 01", "type":"reference", "is_secret": False}, {}]

        if not anonymous:
            cookies = self._cookies()
        else:
            cookies = None

        r = requests.post(url, data=json.dumps(payload), cookies=cookies)

        resp = MBMessage(r.content)

        if not anonymous:
            self.assertTrue(isinstance(resp.payload, dict))

            self.assertEqual(resp.payload.get('title'), 'Test 01')
            self.assertEqual(len(resp.payload.get('urls')), 0)

            self.test_fetch_list(resp.payload.get('hash'))

            return resp.payload.get('hash')

        else:
            self.assertEqual(resp.action, 'OperationalError')
            self.assertEqual(resp.payload, 'PermissionDenied')

            return None

    def test_add_url_as_anonymous(self):
        """Anonymous user cannot add url to a list."""
        self.test_add_url(anonymous=True)

    def test_add_url(self, anonymous=False):
        """Add urls to a list and check the position attribute.
           Urls added without position are placed be on top.

           Default value for section is 0 (Uncategorized)."""
        list_hash = self.test_add_list()

        if not anonymous:
            cookies = self._cookies()
        else:
            cookies = None

        # ( ((url, position), expected_position)), )
        test_urls = [
            (('http://www.google.com', None), 4),
            (('http://www.google.it', None), 3),
            (('http://www.google.de', None), 1),
            (('http://www.google.co.uk', 2), 2)
        ]

        add_url = lambda url, position: self._add_url(cookies,
                                              list_hash, url=url,
                                             position=position)

        return (list_hash, self._test_list_action(anonymous, cookies,
                                                  list_hash, test_urls,
                                                  add_url))

    def test_domain(self):
        list_hash, urls = self.test_add_url()

        list_data = self.test_fetch_list(list_hash)

        url = list_data.get('urls')[0]

        self.assertEqual(url.get('domain'), 'google.de')

    def test_move_url(self, anonymous=False):
        list_hash, urls = self.test_add_url(anonymous)

        urls_url = [x.get('url') for x in urls]

        if not anonymous:
            cookies = self._cookies()
        else:
            cookies = None

        def check_url_position(url, position):
            urls = self.test_fetch_list(list_hash).get('urls')

            url = [x for x in urls if x.get('url') == url].pop()

            self.assertEqual(url.get('position'), position)

        def move_url(url, position, section):
            url_data = [x for x in urls if x.get('url') == url].pop()
            url_hash = url_data.get('hash')

            self._move_url(cookies, list_hash, url_hash=url_hash,
                           position=position, section=section)

            check_url_position(url, position)

        move_url(urls_url[0], 3, None)
        move_url(urls_url[2], 4, None)

        check_url_position(urls_url[1], 1)

    def test_add_comment_anonymous(self):
        self.test_add_comment(anonymous=True)

    def test_add_comment(self, anonymous=False):
        list_hash, urls = self.test_add_url(anonymous)

        urls_url = [x.get('url') for x in urls]

        if not anonymous:
            cookies = self._cookies()
        else:
            cookies = None

        self._mb_msg('add-comment', cookies, list_hash,
                     **{'comment': 'Cheesus died for your sins'})
        self._mb_msg('add-comment', cookies, list_hash,
                     **{'comment': 'Friederich Ludwig Sponsplats'})
        self._mb_msg('add-comment', cookies, list_hash,
                     **{'comment': 'Ziltoid The Omniscient was here'})

        list_data = self.test_fetch_list(list_hash)

        comments = list_data.get('comments', [])

        self.assertEqual(len(comments), 3)
        self.assertEqual(comments[0].get('comment'), 'Cheesus died for your sins')

        return list_data

    def test_remove_comment_anonymous(self):
        self.test_remove_comment(anonymous=True)

    def test_remove_comment(self, anonymous=False):
        if not anonymous:
            cookies = self._cookies()
        else:
            cookies = None

        list_data = self.test_add_comment(anonymous)
        list_hash = list_data.get('hash')
        comments = list_data.get('comments', [])
        victim = comments[1]

        self._mb_msg('remove-comment', cookies, list_hash,
                     **{'comment_id': victim.get('comment_id')})

        list_data = self.test_fetch_list(list_hash)
        comments = list_data.get('comments', [])

        self.assertEqual(len(comments), 2)
        self.assertEqual(comments[1].get('comment'), 'Ziltoid The Omniscient was here')

        return list_data

    def test_relist_url(self, anonymous=False):
        src_list_hash, src_urls = self.test_add_url(anonymous)
        dst_list_hash = self.test_add_list(anonymous)

        url_data = src_urls[0]

        if not anonymous:
            cookies = self._cookies()
        else:
            cookies = None

        resp = self._mb_msg('relist-url', cookies,
                            list_hash=dst_list_hash,
                            from_list_hash=dst_list_hash,
                            from_url_hash=url_data.get('hash'),
                            url=url_data.get('url'))

        dst_list_data = self.db.urlists.find_one({'hash': dst_list_hash})
        dst_urls = [x for x in dst_list_data.get('urls')]

        self.assertEqual(len(dst_urls), 1)

        relisted_url = dst_urls[0]

        self.assertEqual(relisted_url.get('from_list_hash'),
                         src_list_hash)
        self.assertEqual(relisted_url.get('from_url_hash'),
                         url_data.get('hash'))


if __name__ == '__main__':
    unittest.main()
