import time
import re
import random
import logging
import datetime
import uuid
import bson
import requests

import motherbrain.models.operations.url as url_op

from itertools import chain

from email.utils import parseaddr

from motherbrain import conf, models
from motherbrain.workers import clusters
from motherbrain.models import urlist, user, contributor, profile
from motherbrain.models.operations import MBPipe
from motherbrain.workers.decorators import secure_action, action
from motherbrain.workers import OperationalError
from motherbrain.workers.actions.permissions import Permission
from motherbrain.base import crypt_password
from motherbrain.helpers import slug

from motherbrain.models.profile import new_token, token_is_valid, write_oauth

from motherbrain.base import hash_generator

from tornado import template

from bson.objectid import ObjectId

slugify = slug.u_slugify

logging.info('MBACTION::LOAD --- {}'.format(__name__))


_settings = conf.get_settings()

db = conf.get_db(_settings)
template = template.Loader(_settings.get('env', 'templates'))

admin_ids = [str(x.get('_id')) for x in db.users.find({'__admin': True})]

permissions = Permission(db, admin_ids)


def _urlist_auth(context):
    user_id = context.get('current_user_id')
    result = db.users.find_one({'_id': ObjectId(user_id)}, safe=True)

    if not result:
        return (user_id, None)

    return (user_id, result)


def unique_list_hash():
    while True:
        _hash = hash_generator()

        if db.urlists.find_one({'hash': _hash}):
            continue

        return _hash


def _follow_user(user_a, user_b):
    user_a = str(user_a)
    user_b = str(user_b)

    # User A is following User B
    db.users.update({'_id': ObjectId(user_a)},
                    {'$addToSet': {'following_users': {'user_id': user_b}}})

    # ...so User B is followed by User A
    db.users.update({'_id': ObjectId(user_b)},
                    {'$addToSet': {'followers': user_a}})


def _unfollow_user(user_a, user_b):
    user_a = str(user_a)
    user_b = str(user_b)

    # User A no longer follow User B
    db.users.update({'_id': ObjectId(user_a)},
                    {'$pull': {'following_users': {'user_id': user_b}}})

    # ...so User B is no longer followed by User A
    db.users.update({'_id': ObjectId(user_b)},
                    {'$pull': {'followers': user_a}})


def calculate_list_rank(list_data):
    now = datetime.datetime.now()
    last_action_time = list_data.get('last_action_time', list_data.get('creation_time'))

    bookmarks = float(len(list_data.get('followers')))
    views = float(list_data.get('views_amount', 0))

    oldness = float((now - last_action_time).days)

    rank = ((0.5 * (bookmarks * bookmarks)) + (0.1 * views)) * (1 / (oldness + 1))

    return float(rank)


@secure_action(_urlist_auth, clusters.BASE)
def update_list_cover_author(context, list_hash=None, url_author=None):
    user_id = context.get('current_user_id')
    permissions.check_permissions('update_list', user_id, list_hash)

    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        raise OperationalError("ListDoesNotExist")

    db.urlists.update({'hash': list_hash}, {'$set': {'list_cover_author': url_author}})

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def whoami(context):
    user_id = context.get('current_user_id')
    user_oid = ObjectId(user_id)

    user_data = db.users.find_one({'_id': user_oid})

    if not user_data:
        return {}

    return {'username': user_data.get('username'),
            'user_id': user_id,
            'is_logged': not user_data.get('is_anonymous')}

@secure_action(_urlist_auth, clusters.BASE)
def update_categories(context, list_hash=None, categories=None):
    user_id = context.get('current_user_id')
    permissions.check_permissions('update_categories', user_id, list_hash)

    now = datetime.datetime.now()

    db.urlists.update({'hash': list_hash},
                      {'$set': {'categories': categories}})

    return {}

@secure_action(_urlist_auth, clusters.BASE)
def fetch_list_by_categories(context, categories=None):
    if not isinstance(categories, list):
        categories = [categories]

    categories_data = db.urlists.find({'categories': {'$all': categories}})

    return {'lists': [x.get('hash') for x in categories_data if len(x.get('urls', []))],
            'category_id': categories}

@secure_action(_urlist_auth, clusters.BASE)
def check_list(context, list_hash=None, update_time=None):
    now = datetime.datetime.now()

    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        raise OperationalError('ListDoesNotExist')

    user_id = context.get('current_user_id')

    m = models.urlist.Model(list_data)
    list_model_data = m(context)

    list_update_time = list_model_data.get('update_time')

    db.visit_tracker.update({'hash': list_hash,
                             'user_id': user_id},
                            {'$set': {'last_visit_at': now}}, upsert=True)

    if list_update_time == update_time:
        return {}

    return list_model_data


@secure_action(_urlist_auth, clusters.BASE)
def add_list(context, title=None, description=None,
                      type=None, contribs=None, is_secret=None):
    """ Create a new list. """

    user_id = context.get('current_user_id')
    user_oid = ObjectId(user_id)

    permissions.check_permissions('add_list', user_id)

    list_hash = unique_list_hash()

    _default_section = {'section_id': 0, 'position': 1, 'title': ''}

    now = datetime.datetime.now()

    data = {'hash': list_hash,
            'edit_hash': list_hash,
            'title': title,
            'slug': '-'.join([list_hash, slugify(title)]),
            'views_amount': 0,
            'user_id': user_id,
            'description': description,
            'type': type or "draft",
            'followers': [],
            'contributors': contribs or [],
            'creation_time': now,
            'update_time': now,
            'last_action_time': now,
            'last_action_id': user_id,
            'is_secret': is_secret or False,
            'sections': [_default_section],
            'urls': []}

    db.urlists.insert(data, safe=True)

    if description and description.find('#') > -1:
        hashtags = hashtags_from_description(description)
        update_hashtags(hashtags)

    model = urlist.Model(data)
    model(context)

    return model.render_data


@secure_action(_urlist_auth, clusters.BASE)
def remove_list(context, list_hash=None):
    """Remove a list, deleting also search index records."""

    user_id = context.get('current_user_id')

    permissions.check_permissions('remove_list', user_id, list_hash)

    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        raise OperationalError('ListDoesNotExist')

    now = datetime.datetime.now()

    db.urlists_trash.insert(dict({'deleted_at': now,
                                  'delete_by': user_id}, **list_data))

    db.urlists.remove({'hash': list_hash})

    update_hashtags(list_hash, "")

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def fetch_list(context, list_hash=None):
    """Fetch a document from urlists collection by list hash"""
    user_id = context.get('current_user_id')
    data = db.urlists.find_one({'hash': list_hash})

    if not data:
        raise OperationalError("List with hash '{}' does not exist.".format(list_hash))

    _is_admin = user_id in admin_ids

    _is_unlisted = data.get('is_unlisted')

    _is_owner = data.get('user_id') == user_id
    _is_secret = data.get('is_secret')
    _is_contrib = any([(x.get('user_id') == user_id and x.get('status') == 'accepted')
                       for x in data.get('contributors')])

    _hide = _is_secret and not any([_is_owner, _is_contrib, _is_admin])

    if not _is_unlisted and _hide:
        raise OperationalError("List with hash '{}' does not exist.".format(list_hash))

    pipe = MBPipe(data.get('urls'),
                  url_op.sort_by_section,
                  url_op.update_position)

    data['urls'] = pipe()

    model = urlist.Model(data)
    model(context)

    return model.render_data


@secure_action(_urlist_auth, clusters.BASE)
def fetch_user_lists(context, user_id=None):
    """Fetch a document from urlists collection by list hash"""

    from motherbrain.models.working_set import Collection

    user_id = user_id or context.get('current_user_id')
    user_oid = ObjectId(user_id)

    data = db.urlists.find({'user_id': user_oid})

    ws = Collection(list(data))

    return {'lists': ws(context)}


@secure_action(_urlist_auth, clusters.BASE)
def fetch_user(context, user_id=None, username=None):
    if user_id:
        query = {'_id': ObjectId(user_id)}
    else:
        query = {'username': username}

    data = db.users.find_one(query)

    if not data:
        raise OperationalError('UserDoesNotExist')

    model = user.Model(data)
    return model(context)


@secure_action(_urlist_auth, clusters.BASE)
def fetch_user_profile(context, user_id=None, username=None):
    """Fetch a document from user collection by username/user_id,
       add a 'lists' field which contains the user working_set"""
    current_user_id = context.get('current_user_id')

    if user_id:
        query = {'_id': ObjectId(user_id)}
    else:
        query = {'username': username}

    data = db.users.find_one(query)

    if not data:
        raise OperationalError('UserDoesNotExist')

    is_owner = current_user_id == str(data.get('_id'))

    model = profile.Model(data)

    if is_owner and data.get('welcome'):
        db.users.update({'_id': data.get('_id')},
                        {'$unset': {'welcome': 1}})

    return model(context)


@secure_action(_urlist_auth, clusters.BASE)
def add_url(context, list_hash=None,
            url=None, position=None, section=None, title=None,
            description=None, embed_handler=None, owner_id=None,
            from_list_hash=None, from_url_hash=None):
    """Fetch a page by url and push it to the urls array in a given urlist"""

    user_id = context.get('current_user_id')
    user_oid = ObjectId(user_id)

    if not owner_id:
        owner_id = user_id

    permissions.check_permissions('add_url', user_id, list_hash)

    list_ = db.urlists.find_one({'hash': list_hash},
                                ['user_id', 'title', 'description',
                                 'urls', 'contributors', 'followers'])
    urls = list_.get('urls')

    if url_op.exists(urls, url):
        raise OperationalError('UrlExists')

    fun = MBPipe(urls, url_op.add, url_op.update_position)

    section = section or 0

    results = fun(list_hash, url, position,
                  section, owner_id, title, description,
                  embed_handler, from_list_hash, from_url_hash)

    now = datetime.datetime.now()

    db.urlists.update({'hash': list_hash},
                      {'$unset': {'urls': 1},
                       '$set': {'update_time': now,
                                'last_action_time': now,
                                'last_action_id': user_id},
                       '$inc': {'links_amount': 1}},
                      safe=True)

    db.urlists.update({'hash': list_hash},
                      {'$push': {'urls': {'$each': results}}},
                      safe=True)

    new_url = [x for x in results if x.get('url') == url].pop()

    new_url_model = models.url.Model(new_url)
    new_url_model(context)

    new_url_data = new_url_model.render_data

    def notify(notification_type):
        _add_notification = lambda rcpt_id: add_notification(user_id,
                                                             rcpt_id, notification_type, {'list_hash': list_hash,
                                                                                          'url_hash': new_url_data.get('hash'),
                                                                                          'from_list_hash': from_list_hash})

        contributors_ids = [x.get('user_id')
                            for x in list_.get('contributors')
                            if x.get('status') == 'accepted']

        {_add_notification(x)
         for x in list(chain(contributors_ids,
                             list_.get('followers'), [list_.get('user_id')]))
         if x != user_id}

    if from_list_hash:
        notify("relist_url")
    else:
        notify("add_url")

    def queue(worker):
        queue_args = [{}, {'list_hash': list_hash,
                           'url_hash': new_url_data.get('hash')}, context]

        worker.queue.push_msg('new_url', *queue_args)

        return new_url_data

    return queue


@secure_action(_urlist_auth, clusters.BASE)
def update_url(context, list_hash=None, url_hash=None, **kwargs):
    """Update url data with values from a payload/dict"""

    user_id = context.get('current_user_id')
    permissions.check_permissions('update_url', user_id, list_hash)

    _update_data = {'urls.$.{}'.format(k): v
                    for k, v in kwargs.iteritems()}
    _update_list_ts = {'update_time': datetime.datetime.now()}

    update_data = dict(_update_data, **_update_list_ts)

    db.urlists.update({'hash': list_hash, 'urls.hash': url_hash},
                      {'$set': update_data}, safe=True)

    return {}

def update_hashtags(list_hash, hashtags, init=False):
    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        return

    if not isinstance(hashtags, (list, tuple)):
        return

    hashtags.sort()

    if not init:
        prev_hashtags = sorted(list_data.get('hashtags', []))
    else:
        prev_hashtags = []

    for x in hashtags:
        db.urlists.update({'hash': list_hash},
                          {'$addToSet': {'hashtags': x}})

    new_hashtags = [x for x in hashtags if not x in prev_hashtags]
    deleted_hashtags = [x for x in prev_hashtags if not x in hashtags]

    def add_hashtag(hashtag):
        db.hashtags.update({'hashtag': hashtag},
                           {'$addToSet': {'lists': list_hash}}, upsert=True)

    def del_hashtag(hashtag):
        db.hashtags.update({'hashtag': hashtag},
                           {'$pull': {'lists': list_hash}}, upsert=True)

    [add_hashtag(x) for x in new_hashtags]
    [del_hashtag(x) for x in deleted_hashtags]

    return


def hashtags_from_description(s):
    s = s.strip().replace(u'\xa0', u' ')

    if not isinstance(s, (unicode, str)):
        return []

    def fmt(x):
        strip = ['.', ';', ':', ',']

        for s in strip:
            x = x.replace(s, '')

        return x

    return [fmt(x) for x in s.split(' ')
            if x.startswith('#') and isinstance(x, (str, unicode))]


@secure_action(_urlist_auth, clusters.BASE)
def update_list(context, list_hash=None, **kwargs):
    """Update an urlist with values from a payload/dict"""

    results = {}

    user_id = context.get('current_user_id')
    permissions.check_permissions('update_list', user_id, list_hash)

    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        raise OperationalError("ListDoesNotExist")

    make_slug = lambda: u'-'.join([list_hash, slugify(kwargs.get('title'))])

    has_changed = lambda field: all([field in kwargs,
                                     kwargs.get(field) != list_data.get(field)])

    update_data = {}

    if has_changed('title'):
        kwargs['slug'] = make_slug()
        results['slug'] = kwargs.get('slug')

    if has_changed('description'):
        hashtags = hashtags_from_description(kwargs.get('description'))
        update_hashtags(list_hash, hashtags)

    update_data['$set'] = kwargs

    db.urlists.update({'hash': list_hash}, update_data)

    return results


@secure_action(_urlist_auth, clusters.BASE)
def update_sections(context, list_hash=None, sections=None, **kwargs):
    """Update list sections."""

    user_id = context.get('current_user_id')
    permissions.check_permissions('update_sections', user_id, list_hash)

    ordered_sections = [dict(x, **{'position': i + 1})
                        for i, x in enumerate(sections)]

    db.urlists.update({'hash': list_hash},
                      {'$set': {'sections': ordered_sections}})

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def add_section(context, list_hash=None, section_title=None, **kwargs):
    user_id = context.get('current_user_id')
    permissions.check_permissions('update_sections', user_id, list_hash)

    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        raise OperationalError("ListDoesNotExist")

    sections = list_data.get('sections', [])

    def make_section(sid=0):
        return {'section_id': sid,
                'position': sid + 1,
                'title': section_title or ''}

    if len(sections):
        new_section = make_section(sections[-1].get('section_id') + 1)
    else:
        new_section = make_section()

    db.urlists.update({'hash': list_hash},
                      {'$addToSet': {'sections': new_section}})

    return {'section_id': new_section.get('section_id')}


@secure_action(_urlist_auth, clusters.BASE)
def remove_section(context, list_hash=None, section_id=None):
    """Remove list section."""

    if section_id is None:
        raise OperationalError('MissingSectionId')

    if not isinstance(section_id, int):
        try:
            section_id = int(section_id)
        except ValueError:
            raise OperationalError('InvalidSectionId')

    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        raise OperationalError('ListDoesNotExist')

    url_hashes = [x.get('hash') for x in list_data.get('urls')
                      if x.get('section') == section_id]

    user_id = context.get('current_user_id')
    permissions.check_permissions('update_sections', user_id, list_hash)


    db.urlists.update({'hash': list_hash},
                      {'$pull': {'sections': {'section_id': section_id},
                                 'urls': {'section': section_id}},
                       '$inc':  {'links_amount': -len(url_hashes)}}, safe=True)

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def remove_url(context, list_hash=None, url_hash=None):
    """Remove a url in a urlist by it's hash and then
    rebuild position attribute"""

    user_id = context.get('current_user_id')
    permissions.check_permissions('remove_url', user_id, list_hash)

    list_ = db.urlists.find_one({'hash': list_hash}, ['urls', 'user_id'])
    urls = list_.get('urls')

    fun = MBPipe(urls,
                 url_op.remove,
                 url_op.update_position)

    results = fun(url_hash)

    db.urlists.update({'hash': list_hash},
                      {'$set': {'urls': results,
                                'update_time': datetime.datetime.now()},
                       '$inc': {'links_amount': -1}})

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def move_url(context, list_hash=None, url_hash=None,
             position=None, section=None):
    """Move a url by changing is index according to @position argument.
    Update both index and position attribute."""
    list_ = db.urlists.find_one({'hash': list_hash}, ['urls'])
    urls = list_.get('urls')

    fun = MBPipe(urls,
                 url_op.sort_by_section,
                 url_op.move,
                 url_op.update_position)

    results = fun(url_hash, position, section)

    db.urlists.update({'hash': list_hash},
                      {'$set': {'urls': results,
                                'update_time': datetime.datetime.now()}})

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def move_url_to_another_list(context, from_list=None, to_list=None):
    if not from_list or not to_list:
        raise OperationalError("MissingArguments")

    def list_data(list_hash, **kwargs):
        x = db.urlists.find_one({'hash': list_hash})

        if not x:
            raise OperationalError("ListDoesNotExist:{}".format(list_hash))

        return x

    source_list = list_data(**from_list)
    target_list = list_data(**to_list)

    _source_url = [x for x in source_list.get('urls', [])
                   if x.get('hash') == from_list.get('url_hash')]

    if not len(_source_url):
        raise OperationalError("SourceUrlDoesNotExist")

    source_url = _source_url[0]

    def queue(worker):
        add_job  = add_url(context, list_hash=to_list.get('list_hash'),
                    url=source_url.get('url'),
                    position=0,
                    section=to_list.get('section'),
                    title=source_url.get('title'),
                    description=source_url.get('description'),
                    embed_handler=source_url.get('embed_handler'),
                    from_list_hash=source_url.get('from_list_hash'),
                    from_url_hash=source_url.get('from_url_hash'))

        add_job_result = add_job(worker)

        if not add_job_result.get('hash'):
            logging.info("FAIL")
            raise OperationalError("CannotMoveList")

        remove_url(context, source_list.get('hash'), from_list.get('url_hash'))

        return add_job_result

    return queue


@secure_action(_urlist_auth, clusters.BASE)
def relist_url(context, list_hash=None, from_list_hash=None,
               from_url_hash=None, title=None, description=None,
               position=None, section=None, url=None, embed_handler=None):
    """Copy a url to another user-specified list"""

    now = datetime.datetime.now()

    user_id = context.get('current_user_id')
    permissions.check_permissions('relist_url', user_id)

    orig_url_data = db.urlists.find_one({'hash': from_list_hash})

    if not orig_url_data:
        raise OperationalError('SourceListDoesNotExist')

    try:
        owner_id = [str(x.get('user_id')) for x in orig_url_data.get('urls')
                    if x.get('hash') == from_url_hash].pop()
    except IndexError:
        raise OperationalError('SourceUrlDoesNotexist')

    def do(worker):
        _add = add_url(context, list_hash=list_hash, url=url,
                       position=position, section=section, title=title,
                       embed_handler=embed_handler, from_list_hash=list_hash)

        new_url_data = _add(worker)
        new_url_hash = new_url_data.get('hash')

        db.urlists.update({'hash': from_list_hash},
                          {'$set': {'update_time': now}})

        tracker_relist_data = {'user_id': user_id,
                               'target_list_hash': list_hash,
                               'relisted_at': datetime.datetime.now()}

        relist_data = {'urls.$.from_url_hash': from_url_hash,
                       'urls.$.from_list_hash': from_list_hash,
                       'urls.$.from_user_id': owner_id,
                       'urls.$.title': title,
                       'urls.$.description': description}

        db.urlists.update({'hash': list_hash, 'urls.url': url},
                          {'$set': relist_data}, safe=True)

        db.relist_tracker.update({'list_hash': from_list_hash,
                                  'url_hash': from_url_hash},
                                  {'$inc': {'count': 1},
                                   '$addToSet': {'relists': tracker_relist_data}},
                                  upsert=True)

        add_notification(user_id,
                         orig_url_data.get('user_id'),
                         "relist_url",
                         {'list_hash': list_hash,
                          'from_url_hash': from_url_hash,
                          'from_list_hash': from_list_hash})

        worker.queue.push_msg('relist_url',
                              {},
                              {'list_hash': list_hash,
                               'url_hash': new_url_hash,
                               'source_list_hash': from_list_hash,
                               'source_url_hash': from_url_hash}, context)

        return {}

    return do


def add_notification(user_id=None, rcpt_id=None, subject=None, data=None):
    now = datetime.datetime.now()

    db.notifications.insert({'_id': bson.ObjectId(),
                             'sent_at': now,
                             'user_id': user_id,
                             'rcpt_id': rcpt_id,
                             'subject': subject,
                             'data': data})


@secure_action(_urlist_auth, clusters.BASE)
def add_contributor(context, list_hash=None, user_id=None):
    """Add a contributors to the current list and generate a notification."""

    sender_id = context.get('current_user_id')
    receiver_id = user_id

    notification_query = {'list_hash': list_hash,
                          'sender_id': sender_id,
                          'user_id': receiver_id}

    notification_data = db.contrib_notifications.find_one(notification_query)

    if notification_data:
        return {}

    contributor_data = {'invited_at': datetime.datetime.now(),
                        'status': 'pending',
                        'id': receiver_id,
                        'user_id': receiver_id}

    db.urlists.update({'hash': list_hash},
                      {'$push': {'contributors': contributor_data}})

    noid = bson.ObjectId()
    nid = str(noid)

    notification_data = dict(contributor_data, **{'list_hash': list_hash,
                                                  'sender_id': sender_id,
                                                  '_id': noid})

    db.contrib_notifications.insert(notification_data)

    add_notification(sender_id,
                     receiver_id,
                     "contrib_request",
                     {'notification_id': nid,
                      'list_hash': list_hash,
                      'user_id': sender_id})

    _follow_user(sender_id, receiver_id)

    def queue(worker):
        worker.queue.push_msg('invite_to_list',
                              {},
                              {'list_hash': list_hash,
                               'recv_id': user_id,
                               'sender_id': sender_id}, context)

        return contributor_data

    return queue


@secure_action(_urlist_auth, clusters.BASE)
def remove_contributor(context, user_id=None, list_hash=None):
    sender_id = context.get('current_user_id')

    db.contrib_notifications.remove({'user_id': user_id,
                                     'sender_id': sender_id,
                                     'list_hash': list_hash})

    contrib_data = {'user_id': user_id}

    db.urlists.update({'hash': list_hash},
                      {'$pull': {'contributors': contrib_data}})

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def fetch_contrib_notifications(context):
    user_id = context.get('current_user_id')

    data = db.contrib_notifications.find({'user_id': user_id,
                                          'status': 'pending'})

    notifications = contributor.Collection(list(data))

    return {'notifications': notifications(context)}


@secure_action(_urlist_auth, clusters.BASE)
def accept_contrib_request(context, notification_id=None):
    notifications =  db.contrib_notifications
    now = datetime.datetime.now()

    def _notification_data():
        notification_oid = ObjectId(notification_id)

        _query = {'_id': notification_oid}
        _update = {'$set': {'status': 'accepted',
                            'accepted_at': now}}

        return notifications.find_and_modify(_query, _update)

    notification_data = _notification_data()
    list_hash = notification_data.get('list_hash')

    sender_id = notification_data.get('sender_id')
    invited_user_id = context.get('current_user_id')

    def _update_list():
        _query = {'hash': list_hash,
                'contributors.id': invited_user_id}
        _update = {'$set': {'contributors.$.accepted_at': now,
                            'contributors.$.status': 'accepted'}}

        db.urlists.find_and_modify(_query, _update)


    _update_list()
    _follow_user(invited_user_id, sender_id)

    db.notifications.update({'data.notification_id': notification_id},
                            {'$set': {'read_at': now, 'status': 'accepted'}})

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def decline_contrib_request(context, notification_id=None):
    now = datetime.datetime.now()

    notification_oid = ObjectId(notification_id)

    contrib_data = db.contrib_notifications.find_one(
                    {'_id': notification_oid})

    if not contrib_data:
        raise OperationalError('ContribNotificationDoesNotExist')

    target_user_id = contrib_data.get('user_id')
    list_hash = contrib_data.get('list_hash')

    db.contrib_notifications.remove({'_id': notification_oid})

    if not list_hash:
        raise OperationalError('ListDoesNotExist')

    db.urlists.find_and_modify(
            {'hash': list_hash},
            {'$pull': {'contributors': {'user_id': target_user_id}}})

    db.notifications.update({'data.notification_id': notification_id},
                            {'$set': {'read_at': now, 'status': 'declined'}})

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def users_autocomplete(context, query, page=1, items_per_page=10):
    fields = ['username', 'screen_name', 'profile_image']

    mongo_query = {'$or': [{'username': {'$regex': query}},
                  {'screen_name': {'$regex': query, '$options': 'i'}}]}

    offset = (page - 1) * items_per_page
    items_per_page += offset

    results_page = db.users.find(mongo_query, fields)[offset:items_per_page]

    return {'results': [dict(x, **{'user_id': str(x.pop('_id'))})
                        for x in results_page]}


@secure_action(_urlist_auth, clusters.BASE)
def add_saved_search(context, query=None):
    user_id = context.get('current_user_id')
    user_oid = ObjectId(user_id)

    search_id = str(ObjectId())

    saved_search = {'query': query, 'search_id': search_id}

    db.users.update({'_id': user_oid},
                    {'$addToSet': {'saved_searches': saved_search}})

    return {'search_id': search_id}


@secure_action(_urlist_auth, clusters.BASE)
def remove_saved_search(context, query=None, search_id=None):
    user_id = context.get('current_user_id')
    user_oid = ObjectId(user_id)

    saved_search = {'query': query, 'search_id': search_id}

    db.users.update({'_id': user_oid},
                    {'$pull': {'saved_searches': saved_search}})

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def follow_user(context, user_id=None):
    current_user_id = context.get('current_user_id')

    _follow_user(current_user_id, user_id)

    add_notification(current_user_id, user_id, "follow_user")

    def queue(worker):
        worker.queue.push_msg('new_user_follower',
                              {'target_user_id': user_id},
                              {'user_id': current_user_id},
                              context)

        return {}

    return queue


@secure_action(_urlist_auth, clusters.BASE)
def unfollow_user(context, user_id=None):
    current_user_id = context.get('current_user_id')

    _unfollow_user(current_user_id, user_id)

    return {}


def _follow_list(user_id, list_hash, **kwargs):
    q = dict({'hash': list_hash}, **kwargs)

    db.urlists.update(q, {'$addToSet': {'followers': user_id}})

@secure_action(_urlist_auth, clusters.BASE)
def follow_list(context, list_hash=None):
    user_id = context.get('current_user_id')

    if not list_hash:
        raise OperationalError("MissingArgument:list_hash")

    permissions.check_permissions('follow_list', user_id, list_hash)

    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        raise OperationalError("ListDoesNotExist")

    _follow_list(user_id, list_hash)

    add_notification(user_id, list_data.get('user_id'), 'bookmark_list', {'list_hash': list_hash})

    def queue(worker):
        worker.queue.push_msg('new_list_follower',
                              {'list_hash': list_hash},
                              {'user_id': user_id},
                              context)

        return {}

    return queue


@secure_action(_urlist_auth, clusters.BASE)
def unfollow_list(context, list_hash=None):
    user_id = context.get('current_user_id')

    if not list_hash:
        raise OperationalError("MissingArgument:list_hash")

    permissions.check_permissions('follow_list', user_id, list_hash)

    db.urlists.update({'hash': list_hash},
                      {'$pull': {'followers': user_id}})

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def update_profile(context, user_id=None, **kwargs):
    user_id = context.get('current_user_id')
    user_oid = ObjectId(user_id)

    user_data = db.users.find_one({'_id': user_oid})
    now = datetime.datetime.now()

    extra = {}

    if not user_data:
        raise OperationalError('UserDoesNotExists')

    whitelist = ['username', 'location', 'short_bio', 'screen_name', 'website',
                 'notify_add_url', 'notify_relist', 'notify_follow_user',
                 'notify_follow_list', 'show_facebook_link', 'notify_suggest_url']

    progress = list({x for x in user_data.get('progress', [])})
    progress_vars = ['short_bio', 'screen_name']

    for k in progress_vars:
        v = kwargs.get(k, "")
        v = v.strip()

        if isinstance(v, (str, unicode)):
            if k in progress and len(v) > 3:
                progress.remove(k)
            elif k not in progress and v == "":
                progress.append(k)

    if 'confirm_username' in kwargs:
        kwargs.remove('confirm_username')
        progress.remove('username')

    extra['progress'] = progress

    def _validate_username(username):
        if db.users.find_one({'username': username}, ['_id']):
            raise OperationalError('UsernameAlreadyTaken')

        is_valid = models.profile.username_is_valid

        if not is_valid(username):
            raise OperationalError('ValidationError')

        return username

    def _username_is_changed():
        new_username = kwargs.get('username')
        old_username = user_data.get('username')

        if not new_username or new_username == '':
            return False

        if new_username == old_username:
            return False

        if new_username:
            _validate_username(new_username)

        return now

    username_is_changed = _username_is_changed()

    if username_is_changed and user_data.get('username_changed_at'):
        raise OperationalError('CannotChangeUsername')
    elif username_is_changed:
        extra = {'username_changed_at': now}

    [kwargs.pop(k) for k in kwargs.keys()
     if not k in whitelist]

    profile_data = dict(kwargs, **extra)

    db.users.update({'_id': user_oid},
                    {'$set': profile_data})

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def authenticate(context, email=None, username=None, password=None, secure_password=None):
    username = username or email

    if not any([password, secure_password]):
        raise OperationalError('MissingPassword')

    if password and not secure_password:
        salt = _settings.get('oauth', 'urlist_salt')
        secure_password = crypt_password(salt, password)

    user_data = db.users.find_one({'$or': [{'username': username},
                                           {'email': username}],
                                   'password': secure_password,
                                   '__ban': None})

    if not user_data:
        raise OperationalError('AuthenticationFailed')

    user_oid = user_data.get('_id')
    user_id = str(user_oid)

    token = user_data.get('urlist_last_token', new_token())

    if not token_is_valid(token):
        logging.info("Invalid token")

        token = new_token()

    write_oauth(db, user_id, token)

    cookie_data = {'oauth_provider': 'urlist',
                   'oauth_user_id': user_id,
                   'oauth_token': token}

    return {'__cookies': cookie_data}


@secure_action(_urlist_auth, clusters.BASE)
def new_profile(context, password=None, email=None, oauth_data=None,  **kwargs):
    m = models.profile

    activation_code = str(uuid.uuid1())
    static_url = _settings.get('env', 'static_url')

    def email_is_valid(email):
        _, email_addr = parseaddr(email)

        if not email_addr:
            raise OperationalError("'{}' is not a valid"
                                "email address.".format(email))

    username, _ = m.make_username_from_email(email, db)
    email_is_valid(email)

    if db.users.find_one({'email': email}):
        raise OperationalError("Mail address already "
                                "associated with an Urlist account.")


    origin_id = context.get('current_user_id')
    origin_oid = ObjectId(origin_id)
    origin = db.users.find_one({'_id': origin_oid})
    origin_ctime = origin.get('creation_time')

    default_values = m.make_defaults(static_url=static_url,
                                     screen_name="",
                                     pending_activation=activation_code,
                                     origin_id=origin_id,
                                     origin_creation_time=origin_ctime)

    whitelist = ['location', 'short_bio', 'screen_name', 'website',
                 'notify_add_url', 'notify_relist', 'notify_follow_user',
                 'notify_follow_list']

    [kwargs.pop(k) for k in kwargs.keys()
     if not k in whitelist]

    salt = _settings.get('oauth', 'urlist_salt')

    try:
        secure_password = crypt_password(salt, password)
    except:
        raise OperationalError("InvalidPassword")

    user_data = dict(username=username,
                     password=secure_password,
                     email=email,
                     **kwargs)

    def set_default(k):
        user_data[k] = default_values.get(k)

    [set_default(k) for k, v in default_values.iteritems()
     if user_data.get(k) is None]

    _ok = db.users.insert(user_data, safe=True)

    if not _ok:
        raise OperationalError(str(_ok))

    def queue(worker):
        worker.queue.push_msg('signup_confirm', {},
                              {'email': email,
                               'activation_code': activation_code},
                              context)

        return {}

    return queue


@secure_action(_urlist_auth, clusters.BASE)
def remove_oauth(context, user_id=None, provider=None):
    user_id = context.get('current_user_id')
    user_oid = ObjectId(user_id)

    if not provider in ['twitter', 'facebook', 'google']:
        raise OperationalError("Unknown provider '{}'".format(provider))

    user_data = db.users.find_one({'_id': user_oid})

    oauth_fields = {k:1 for k in user_data.keys()
                    if k.startswith('{}_'.format(provider))}

    db.users.update({'_id': user_oid},
                    {'$unset': oauth_fields})

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def new_feedback(context, email=None, message=None,
                 user_agent=None, referral=None):
    user_id = context.get('current_user_id')
    user_oid = ObjectId(user_id)

    now = datetime.datetime.now()

    data = {'user_id': user_id,
            'email': email,
            'message': message,
            'referral': referral,
            'created_at': now,
            'user_agent': user_agent}

    db.feedback.insert(data)

    def queue(worker):
        args = {'user_id': user_id,
                'email': email,
                'message': message,
                'user_agent': user_agent,
                'referral': referral,
                'created_at': now}

        worker.queue.push_msg('new_feedback', {}, args, context)

        return {}

    return queue


@secure_action(_urlist_auth, clusters.BASE)
def report_list(context, list_hash=None, email=None,
                message=None, user_agent=None):

    user_id = context.get('current_user_id')
    user_oid = ObjectId(user_id)

    if not db.urlists.find_one({'hash': list_hash}):
        raise OperationalError('ListDoesNotExist')

    now = datetime.datetime.now()

    data = {'user_id': user_id,
            'email': email,
            'message': message,
            'list_hash': list_hash,
            'created_at': now}

    db.feedback.insert(data)

    def queue(worker):
        args = {'email': email,
                'message': message,
                'user_agent': user_agent,
                'list_hash': list_hash}

        worker.queue.push_msg('report_list', {}, args, context)

        return {}

    return queue


@secure_action(_urlist_auth, clusters.BASE)
def activate_account(context, activation_code=None):
    query = {'pending_activation': activation_code}
    update = {'$unset': {'pending_activation': activation_code}}

    user_data = db.users.find_one(query)

    if not user_data:
        raise OperationalError('Invalid activation code')

    db.users.find_and_modify(query, update, safe=True)

    username = user_data.get('username')
    secure_password = user_data.get('password')

    def queue(worker):
        user_id = str(user_data.get('_id'))

        worker.queue.push_msg('welcome', {}, {'user_id': user_id}, context)

        return authenticate(context, username=username,
                            secure_password=secure_password)

    return queue


@secure_action(_urlist_auth, clusters.BASE)
def welcome(context, user_id=None, registered_with=None):
    def queue(worker):
        worker.queue.push_msg('welcome', {},
                {'user_id': user_id}, context)

        return {}

    return queue


@secure_action(_urlist_auth, clusters.BASE)
def recover_password(context, email=None):
    user_data = db.users.find_one({'email': email})

    if not user_data:
        raise OperationalError('UserDoesNotExists')

    user_oid = user_data.get('_id')
    user_id = str(user_oid)
    recover_code = str(uuid.uuid1())

    db.users.update({'_id': user_oid},
                    {'$set': {'recover_code': recover_code}})

    def queue(worker):
        worker.queue.push_msg('recover_password',
                              {},
                              {'email': email,
                               'recover_code': recover_code},
                              context)

        return {}

    return queue


@secure_action(_urlist_auth, clusters.BASE)
def change_password(context, old_password=None, new_password=None, **kwargs):
    user_id = context.get('current_user_id')
    user_oid = ObjectId(user_id)

    salt = _settings.get('oauth', 'urlist_salt')
    secure_old_password = crypt_password(salt, old_password)

    user_data = db.users.find_one({'_id': user_oid,
                                   'password': secure_old_password})

    if not user_data:
        raise OperationalError('PasswordDoesNotMatch')

    secure_new_password = crypt_password(salt, new_password)

    db.users.update({'_id': user_oid},
                    {'$set': {'password': secure_new_password}})

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def reset_password(context, password=None, recover_code=None):
    salt = _settings.get('oauth', 'urlist_salt')

    query = {'recover_code': recover_code}

    def _user_data():
        user_data = db.users.find_one(query)

        if not user_data:
            raise OperationalError('Invalid activation code')

        return user_data

    user_data = _user_data()

    username = user_data.get('username')
    secure_password = user_data.get('password')

    update = {'$unset': {'recover_code': 1},
              '$set': {'password': crypt_password(salt, password)},
              '$unset': {'pending_activation': 1}}

    db.users.find_and_modify(query, update, safe=True)

    return authenticate(context,
                        username=username,
                        password=password)


@secure_action(_urlist_auth, clusters.BASE)
def share_list(context, list_hash=None, emails=None, message=None):
    list_data = db.urlists.find_one({'hash': list_hash}, ['user_id'])

    if not list_data:
        raise OperationalError('ListDoesNotExist')

    def queue(worker):
        queue_args = [{}, {'list_hash': list_hash,
                           'emails': emails,
                           'message': message}, context]

        worker.queue.push_msg('share_list', *queue_args)

        return {}

    return queue


@secure_action(_urlist_auth, clusters.BASE)
def move_list(context, list_hash=None, target_user_id=None):
    target_user_oid = ObjectId(target_user_id)

    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        raise OperationalError('ListDoesNotExist')

    original_user_id = str(list_data.get('user_id'))
    original_user_oid = ObjectId(original_user_id)

    target_user_data = db.users.find_one({'_id': target_user_oid})

    if not target_user_id:
        raise OperationalError('TargetUserDoesNotExist')

    # Update urls
    urls = list_data.get('urls', [])

    def change_url_user_id(url_data):
        user_id = str(url_data.get('user_id'))

        if user_id == original_user_id:
            url_data['user_id'] = str(target_user_id)

        return url_data

    new_urls = [change_url_user_id(url_data) for url_data in urls]

    db.urlists.update({'hash': list_hash},
                      {'$set': {'user_id': target_user_id,
                                'urls': new_urls}}, safe=True)

    db.urlists.update({'hash': list_hash},
                      {'$set': {'update_time': datetime.datetime.now()}})

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def notifications_ack(context):
    now = datetime.datetime.now()
    user_id = context.get('current_user_id')

    db.notifications.update({'rcpt_id': user_id},
                            {'$set': {'read_at': now}}, multi=True)

    return {}


@secure_action(_urlist_auth, clusters.BASE)
def invite_by_email(context, list_hash=None, email=None, message=None):
    user_id = context.get('current_user_id')
    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        raise OperationalError('ListDoesNotExist')

    def queue(worker):
        queue_args = [{}, {'list_hash': list_hash,
                           'emails': email,
                           'message': message}, context]

        worker.queue.push_msg('invite_by_email', *queue_args)

        return {}

    return queue


@action(clusters.BASE)
def ping(context):
    return {}


@action(clusters.BASE)
def suggest_url(context, list_hash=None, url=None, description=None, section_id=None):
    current_user_id = context.get('current_user_id')
    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        raise OperationalError("ListDoesNotExist")

    surl_data = {'url': url,
                 'description': description,
                 'user_id': current_user_id,
                 'sent_at': datetime.datetime.now(),
                 'section_id': section_id,
                 'suggestion_id': bson.ObjectId()}

    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 6.2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1467.0 Safari/537.36'}

    try:
        status_code = requests.get(url, headers=headers).status_code
    except:
        status_code = 400

    if status_code >= 400:
        raise OperationalError("InvalidURL")

    db.urlists.update({'hash': list_hash},
                      {'$push': {'suggested_urls': surl_data}})

    add_notification(current_user_id, list_data.get('user_id'),
                     "suggest_url", {'list_hash': list_hash,
                                     'user_id': current_user_id,
                                     'suggested_url': url})

    def queue(worker):
        worker.queue.push_msg('suggest_url',
                              {},
                              {'list_hash': list_hash,
                               'url': url,
                               'description': description},
                              context)

        return {}

    return queue


@action(clusters.BASE)
def suggested_url_accept(context, list_hash=None, suggestion_id=None):
    current_user_id = context.get('current_user_id')
    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        raise OperationalError("ListDoesNotExist")

    suggested_urls = list_data.get('suggested_urls')

    try:
        suggested_url = [x for x in suggested_urls
                         if x.get("suggestion_id") == bson.ObjectId(suggestion_id)][0]
    except IndexError:
        suggested_url = None

    if not suggested_url:
        raise OperationalError("SuggestedUrlDoesNotExist")

    db.urlists.update({'hash': list_hash},
                      {'$pull': {'suggested_urls': suggested_url}})

    try:
        add_url(context, list_hash=list_hash,
                url=suggested_url.get('url'),
                section=suggested_url.get('section'),
                description=suggested_url.get('description'),
                owner_id=suggested_url.get('user_id'))


        add_notification(current_user_id, suggested_url.get('user_id'),
                        "suggested_url_accept", {'list_hash': list_hash,
                                                 'user_id': current_user_id,
                                                 'suggested_url': suggested_url.get('url')})
    except OperationalError as e:
        raise e

    return {}


@action(clusters.BASE)
def suggested_url_decline(context, list_hash=None, suggestion_id=None):
    current_user_id = context.get('current_user_id')
    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        raise OperationalError("ListDoesNotExist")

    suggested_urls = list_data.get('suggested_urls')

    try:
        suggested_url = [x for x in suggested_urls
                         if x.get("suggestion_id") == bson.ObjectId(suggestion_id)][0]
    except IndexError:
        suggested_url = None

    if not suggest_url:
        raise OperationalError("SuggestedUrlDoesNotExist")

    db.urlists.update({'hash': list_hash},
                      {'$pull': {'suggested_urls': suggested_url}})

    return {}


@action(clusters.BASE)
def onboarding_complete(context):
    db.users.update({'_id': ObjectId(context.get('current_user_id'))},
                     {'$unset': {'pending_onboarding': 1}})

    return {}


@action(clusters.BASE)
def onboarding_pick_categories(context, categories_slugs=None):
    slugs = categories_slugs

    current_user_id = context.get('current_user_id')

    list_hash = 'tel'
    list_data = db.urlists.find_one({'hash':  list_hash})

    if not list_data:
        raise OperationalError("MissingOnboardingList:tel")

    sections = [x.get('section_id') for x in list_data.get('sections')
                if x.get('title', "") in slugs]

    lists = []
    users = []

    def resolve(url):
        parts = url.split("/")
        target_id = parts[-1]

        if 'library' in parts or 'user' in parts:
            users.append(target_id)
        else:
            lists.append(target_id.split('-')[0])

    [resolve(x.get('url')) for x in list_data.get('urls')
     if x.get('section') in sections]

    users_oid = []

    for username in users:
        user = db.users.find_one({'username': username})

        if not user:
            continue

        users_oid.append(str(user.get('_id')))

    [_follow_user(current_user_id, x) for x in users_oid]
    [_follow_list(current_user_id, x, **{'is_secret': {'$ne': True}}) for x in lists]

    return {}
