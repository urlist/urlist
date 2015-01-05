import logging
import urlparse


class MBCache(object):
    def __init__(self, db):
        self.db = db

        if not hasattr(db, 'mbcache'):
            self.db.create_collection('mbcache')

    def get(self, group, key):
        results = self.db.mbcache.find_one({'group': group, 'key': key})

        if not results:
            logging.debug('MBCACHE::MISS --- {}::{}'.format(group, key))
            return None

        logging.debug('MBCACHE::HIT --- {}::{}'.format(group, key))

        return results.get('value')

    def set(self, group, key, value):
        self.db.mbcache.update({'group': group, 'key': key},
                               {'$set': {'value': value}},
                               upsert=True)

    def get_by_netloc(self, group, key):
        addr_data = urlparse.urlparse(key)

        return self.get(group, addr_data.netloc)

    def set_netloc(self, group, key, value):
        addr_data = urlparse.urlparse(key)

        self.set(group, addr_data.netloc, value)
