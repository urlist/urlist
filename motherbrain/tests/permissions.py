import unittest
import pymongo

from bson.objectid import ObjectId

from motherbrain.workers import OperationalError
from motherbrain.workers.actions.permissions import Permission


_fake_users = {'joe': ObjectId(),
               'cassidy': ObjectId(),
               'fox': ObjectId(),
               'anneke': ObjectId(),
               'james': ObjectId(),
               'jesus': ObjectId(),
               'irene': ObjectId(),
               'stepan': ObjectId()}

_anon = {'username': 'anon_1',
         'is_anonymous': True}

_get_user = lambda name: str(_fake_users.get(name))

_lists = [{'title': 'A Foo list',
           'hash': 'FO0',
           'user_id': _get_user('anneke'),
           'contributors': [{'user_id': _get_user('jesus'),
                             'status': 'accepted'},
                            {'user_id': _get_user('cassidy'),
                             'status': 'accepted'},
                            {'user_id': _get_user('fox'),
                             'status': 'pending'}]}
         ]


db = pymongo.Connection().urlist_test

db.urlists.insert(_lists)
db.users.insert([{'_id': v, 'username': k}
                 for k, v in _fake_users.iteritems()])

permissions = Permission(db)


class TestPermission(unittest.TestCase):
    def setUp(self):
        self._db_reset()

        db.urlists.insert(_lists)
        db.users.insert([{'_id': v, 'username': k}
                        for k, v in _fake_users.iteritems()])

        db.users.insert(_anon)

    def tearDown(self):
        self._db_reset()

    def _db_reset(self):
        db.drop_collection('urlists')
        db.drop_collection('users')

    def test_is_author(self):
        urlist = db.urlists.find_one({'hash': 'FO0'})
        author = _get_user('anneke')
        non_author = _get_user('james')

        self.assertTrue(permissions.is_author(author, urlist))
        self.assertFalse(permissions.is_author(non_author, urlist))

    def test_is_contributor(self):
        urlist = db.urlists.find_one({'hash': 'FO0'})
        author = _get_user('anneke')
        non_author = _get_user('james')
        contributor = _get_user('jesus')
        pending_contrib = _get_user('fox')

        self.assertTrue(permissions.is_contributor(contributor, urlist))
        self.assertTrue(permissions.is_contributor(contributor, urlist))
        self.assertFalse(permissions.is_contributor(non_author, urlist))
        self.assertFalse(permissions.is_contributor(pending_contrib, urlist))

    def test_is_anonymous(self):
        user = _get_user('anneke')
        anon = db.users.find_one({'username': 'anon_1'})

        self.assertFalse(permissions.is_anonymous(user))
        self.assertTrue(permissions.is_anonymous(anon))

    def test_is_registered(self):
        user = _get_user('anneke')
        anon = db.users.find_one({'username': 'anon_1'})

        self.assertTrue(permissions.is_registered(user))
        self.assertFalse(permissions.is_registered(anon))

    def test_check_contributor(self):
        list_hash = 'FO0'

        self.assertTrue(permissions.check_contributor(_get_user('jesus'),
                        list_hash))

        self.assertFalse(permissions.check_contributor(_get_user('irene'),
                        list_hash))

    def test_check_author(self):
        list_hash = 'FO0'

        self.assertTrue(permissions.check_author(_get_user('anneke'),
                        list_hash))

        self.assertFalse(permissions.check_author(_get_user('jesus'),
                        list_hash))

        self.assertTrue(permissions.check_contributor(_get_user('jesus'),
                        list_hash))

    def test_check_registered(self):
        anon = db.users.find_one({'username': 'anon_1'})

        self.assertTrue(permissions.check_registered(_get_user('jesus')))
        self.assertFalse(permissions.check_registered(anon))

    def test_check_permissions(self):
        non_owner = _get_user('irene')
        contrib = _get_user('jesus')
        owner = _get_user('anneke')
        anon = db.users.find_one({'username': 'anon_1'})

        self.assertRaises(OperationalError,
                          permissions.check_permissions,
                          'add_url', non_owner, 'FO0')

        self.assertRaises(OperationalError,
                          permissions.check_permissions,
                          'add_url', anon, 'FO0')

        self.assertEqual(None, permissions.check_permissions('add_url', owner, 'FO0'))
        self.assertEqual(None, permissions.check_permissions('add_url', contrib, 'FO0'))


if __name__ == '__main__':
    unittest.main()
