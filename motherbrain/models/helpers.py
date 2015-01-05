import os
import collections
import motherbrain.base
import logging

from motherbrain.base import db as base_db
from motherbrain.base.conf import get_config

from bson.objectid import ObjectId

from itertools import chain


_opts = {
    'database': {
        'dbname':  {'default': 'urlist'},
        'dbhost':  {'default': 'mongo1'},
        'dbport':  {'default': 27017, 'type': int},
        'dbusr':   {'default': ''},
        'dbpwd':   {'default': ''},
    }
}

settings = get_config(_opts)
db = base_db.get_db(settings)


def last_visit(list_hash, current_user_id):
    data = db.visit_tracker.find_one({'hash': list_hash,
                                      'user_id': current_user_id})

    if not data:
        return None

    return data.get('last_visit_at')

def full_url(list_id=None, base_url=None):
    from urlparse import urljoin

    return urljoin(base_url, list_id)


def exclude_owner(data, owner_id):
    return [x for x in data
            if not owner_id == x]


def is_favorited(model_data, current_user_id):
    favorited_by, contributors = model_data

    if not isinstance(favorited_by, collections.Iterable):
        return False

    if isinstance(contributors, collections.Iterable):
        favorited_by = list(chain(favorited_by, contributors))

    if any([True for x in favorited_by
            if (isinstance(x, dict) and
                x.get('user_id') == current_user_id)]):
        return True

    return False


def custom_avatar(model_data):
    user_id, username, profile_image = model_data

    filename = '.'.join([str(user_id), 'png'])

    fullpath = os.path.join('/srv/urlist_media',
                            'profile_images', filename)

    if not os.path.exists(fullpath):
        return profile_image

    return '/'.join(['/media', 'profile_images', filename])


def working_set(user_id, current_user_id):
    from motherbrain.models.working_set import Collection

    _is_owner = {'user_id': str(user_id)}
    _is_contrib = {'contributors.user_id': str(user_id),
                   'contributors.status': 'accepted'}

    query = {'$or': [_is_owner, _is_contrib]}

    if not str(user_id) == str(current_user_id):
        query['$and'] = [{'is_secret': False}]

    # Matches list owned by the user, or contributed to.
    # Private lists are visibles only by owner.
    user_lists = db.urlists.find(query)

    ws = Collection(list(user_lists))

    return ws()


def _lists_left(user_id, lists, bonus, condition, maxnum):
    if not lists:
        return maxnum

    if not bonus:
        bonus = 0

    maxnum += bonus

    num = len([x for x in lists if condition(x) and \
                     x.get('user_id') == str(user_id)])

    return maxnum - num


def secret_lists_left(model_data):
    user_id, lists, bonus = model_data

    condition = lambda x: x.get('is_secret')

    return _lists_left(user_id, lists, bonus, condition, 4)


def draft_lists_left(model_data):
    user_id, lists, bonus = model_data
    condition = lambda x: x.get('type') == 'draft'

    return _lists_left(user_id, lists, bonus, condition, 6)


def relist_amount(model_data):
    list_hash, url_hash, from_list_hash, from_url_hash = model_data

    target_list_hash = list_hash
    target_url_hash = url_hash

    if from_list_hash and from_url_hash:
        target_list_hash = from_list_hash
        target_url_hash = from_url_hash

    tracker = db.relist_tracker.find_one({'list_hash': target_list_hash,
                                          'url_hash': target_url_hash})

    if not tracker:
        return 0

    return tracker.get('count')


def list_relist_amount(list_hash):
    relists = db.relist_tracker.find({'list_hash': list_hash})

    if not relists:
        return 0

    return sum([x.get('count') for x in relists])


def get_userdata(user_id, field):
    oid = ObjectId(user_id)

    user = db.users.find_one({'_id': oid}, [field])

    if not user:
        return None

    return user.get(field)


def get_listdata(hash, field):
    list_ = db.urlists.find_one({'hash': hash}, [field])

    if not list_:
        return None

    return list_.get(field)


def followed_lists(user_id=None):
    from motherbrain.models.working_set import Collection

    user_oid = ObjectId(user_id)

    _is_not_contributor =  {'contributors.user_id': {'$ne': user_id}}
    _is_not_owner = {'user_id': {'$ne': user_id}}

    _exclude = dict(_is_not_contributor, **_is_not_owner)
    _include = {'followers': user_oid}

    _query = dict(_include, **_exclude)

    data = db.urlists.find(_query)

    lists = Collection(list(data))

    return lists()


def is_following_me(model_data, current_user_id=None):
    user_id, xs = model_data

    if not isinstance(xs, list):
        return False

    if current_user_id == user_id:
        return True

    return current_user_id in xs


def relists(model_data):
    '''Return an array of Relisted Url model objects.'''

    list_hash, url_hash, from_list_hash, from_url_hash  = model_data

    if all([from_list_hash, from_url_hash]):
        target_list_hash = from_list_hash
        target_url_hash = from_url_hash
    else:
        target_list_hash = list_hash
        target_url_hash = url_hash

    tracker = db.relist_tracker.find_one({'list_hash': target_list_hash,
                                          'url_hash': target_url_hash})

    if not tracker:
        return []

    relists = [x for x in tracker.get('relists', [])
               if not x.get('target_list_hash') == list_hash]

    from motherbrain.models import relisted_url

    return relisted_url.Collection(relists)()
