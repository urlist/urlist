import logging

from bson.objectid import ObjectId

from mailsnake import MailSnake

from motherbrain import conf, models
from motherbrain.workers import clusters, actions
from motherbrain.workers.decorators import secure_action


_settings = conf.get_settings()
db = conf.get_db(_settings)
search = conf.get_search_engine(_settings)


def _urlist_auth(context):
    user_id = context.get('current_user_id')
    result = db.users.find_one({'_id': ObjectId(user_id)}, safe=True)

    if not result:
        return (user_id, None)

    return (user_id, result)


@secure_action(_urlist_auth, clusters.SEARCH_QUEUE)
def reindex_url(context, list_hash=None, url_hash=None):
    list_data = db.urlists.find_one({'hash': list_hash})

    if not list_data:
        return

    url_data = [x for x in list_data.get('urls')
                if x.get('hash') == url_hash]

    url_data = url_data.pop()

    search.update_url(list_data, url_data)

    return


@secure_action(_urlist_auth, clusters.SEARCH_QUEUE)
def remove_url(context, list_hash=None, url_hash=None):
    search.remove_url(list_hash, url_hash)

    return


@secure_action(_urlist_auth, clusters.SEARCH_QUEUE)
def remove_urls(context, **kwargs):
    search.remove_url(**kwargs)

    return


@secure_action(_urlist_auth, clusters.SEARCH_QUEUE)
def remove_list(context, list_hash=None):
    search.remove_list(list_hash)

    return

