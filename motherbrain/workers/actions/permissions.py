import json
import logging

from bson.objectid import ObjectId

from motherbrain.workers import OperationalError
from motherbrain.conf import get_settings


settings = get_settings()
permissions_file = settings.get('workers', 'permissions_file')


class Permission(object):
    def __init__(self, db, admins=None):
        self.db = db
        self.admins = admins or []

    def _get_user(self, user):
        if isinstance(user, dict):
            return user

        user_oid = ObjectId(str(user))
        user = self.db.users.find_one({'_id': user_oid})

        return user

    def _get_list(self, list_hash):
        return self.db.urlists.find_one({'hash': list_hash})

    def is_author(self, user_id, urlist):
        return str(user_id) == urlist.get('user_id')

    def is_contributor(self, user_id, urlist):
        return user_id in [str(x.get('user_id'))
                        for x in urlist.get('contributors', [])
                        if x.get('status') == 'accepted']

    def is_registered(self, user_id):
        user = self._get_user(user_id)

        return not(self.is_anonymous(user_id))

    def is_anonymous(self, user_id):
        user = self._get_user(user_id)

        return user.get('is_anonymous', False)

    def check_contributor(self, user, list_hash):
        urlist = self._get_list(list_hash)

        return self.is_contributor(user, urlist)

    def check_author(self, user, list_hash):
        urlist = self._get_list(list_hash)

        return self.is_author(user, urlist)

    def check_registered(self, user, *args):
        return self.is_registered(user)

    def check_permissions(self, action, user_id, object_id=None):
        if str(user_id) in self.admins:
            logging.info("AdminPermissionOverride")
            return

        with open(permissions_file, 'r') as f:
            all_permissions = json.load(f)
            permissions = all_permissions.get(action)

        if not permissions:
            return

        entities = permissions.split(' ')

        def _check(entity_name):
            fname = 'check_{}'.format(entity_name)
            f = getattr(self, fname)

            return f(user_id, object_id)

        results = [_check(x) for x in entities]

        if not any(results):
            raise OperationalError('PermissionDenied')

        return
