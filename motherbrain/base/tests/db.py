import unittest
import pymongo

from motherbrain.base import db


class TestModule(unittest.TestCase):
    def setUp(self):
        self.dbconn = db.connect()
        self.settings = db.default_settings

    def tearDown(self):
        self.dbconn.disconnect()

    def test_connect(self):
        self.assertEqual(str(self.dbconn), "Connection('127.0.0.1', 27017)")

    def test_get_db(self):
        db.get_db()
        dbname = self.settings.get('database', 'dbname')
        dbobj = getattr(self.dbconn, dbname)

        self.assertEqual(str(dbobj),
                         """Database(Connection('127.0.0.1', 27017), """
                         """u'urlist')""".format(dbname))


class TestDBConnection(unittest.TestCase):
    def setUp(self):
        self.settings = db.default_settings

    def test_connect(self):
        dbconn = db.DBConnection(self.settings)
        dbconn.connect()

        self.assertEqual(str(dbconn), "Database 'urlist' at 127.0.0.1:27017")

    def test_borg(self):
        dbconn = db.DBConnection(self.settings)
        dbconn.connect()

        dbconn2 = db.DBConnection(self.settings)

        self.assertEqual(str(dbconn2), "Database 'urlist' at 127.0.0.1:27017")


if __name__ == '__main__':
    unittest.main()
