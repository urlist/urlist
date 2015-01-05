import re
import time
import datetime
import logging

from bson.objectid import ObjectId

from motherbrain.base import models
from motherbrain.base.models.processors import Compose, transform, compose

from motherbrain.models import helpers

default_profile_image = "http://static.urli.st/profile_images/default.png"


def _extract(key):
    return lambda x: compose.extract_key(x, key)

def _followers_amount(followers):
    if not isinstance(followers, list):
        return 0

    return len(followers)

def _email(model_data, current_user_id=None):
    user_id, email = model_data

    if not user_id == current_user_id:
        return None

    return email

def _profile_image(model_data):
    urlist_img, fb_img, twitter_img = model_data

    if urlist_img is None:
        urlist_img = ""

    if (fb_img or twitter_img) and urlist_img.find('static.urli.st') != -1:
        return fb_img or twitter_img

    return urlist_img

class Model(models.Model):
    fields = (
        ('_id',          None),
        ('user_id',      [Compose('_id', using=lambda x: x, override=False),
                          transform.MongoOidToStr]),

        ('username',     transform.DoNothing),
        ('website',      transform.DoNothing),
        ('screen_name',  transform.DoNothing),
        ('short_bio',    transform.DoNothing),
        ('location',     transform.DoNothing),

        ('origin_id',    transform.DoNothing),
        ('origin_creation_time', transform.MongoDateTimeToStr),

        ('facebook_profile_img', None),
        ('twitter_profile_img', None),

        ('profile_image', Compose('profile_image', 'facebook_profile_img', 'twitter_profile_img', using=_profile_image)),
        ('profile_cover', transform.DoNothing),
        ('profile_image_small', transform.DoNothing),

        ('notify_add_url', transform.DoNothing),
        ('notify_relist', transform.DoNothing),
        ('notify_follow_user', transform.DoNothing),
        ('notify_follow_list', transform.DoNothing),

        ('username_changed_at', transform.DoNothing),

        # Disable Mixpanel monitoring
        ('__notrack',    transform.DoNothing),

        ('saved_searches',       transform.DoNothing),

        ('is_anonymous', transform.DoNothing),

        ('welcome', transform.DoNothing),
        ('pending_onboarding', transform.DoNothing),

        ('email', Compose('user_id', 'email', using=_email)),

        ('lists',           [Compose('user_id', using=helpers.working_set)]),
        ('followed_lists',        [Compose('user_id', using=helpers.followed_lists)]),

        ('links_amount',     Compose('lists', using=lambda xs: sum(x.get('links_amount') for x in xs or []))),
        ('lists_amount',     Compose('lists', using=lambda xs: len(xs or []))),

        ('secret_lists_bonus',  transform.DoNothing),
        ('draft_lists_bonus',   transform.DoNothing),

        ('facebook_username',  transform.DoNothing),
        ('twitter_username',   transform.DoNothing),
        ('google_username',   transform.DoNothing),

        ('secret_lists_left', Compose('_id', 'lists', 'secret_lists_bonus',
                                       using=helpers.secret_lists_left)),

        ('draft_lists_left', Compose('_id', 'lists', 'draft_lists_bonus',
                                      using=helpers.draft_lists_left)),

        ('followers', None),
        ('followed_by_users', Compose('followers', using=lambda xs: [{'user_id': x} for x in xs or []])),

        ('following_users', transform.DoNothing),

        ('followers_amount', Compose('followers', using=_followers_amount)),

        ('following', Compose('user_id', 'followers', using=helpers.is_following_me)),

        ('creation_time', transform.MongoDateTimeToStr),

        ('progress', transform.DoNothing),

        ('__beta', transform.DoNothing),
    )

    def __init__(self, data):
        super(Model, self).__init__(self.fields, data)

    def __repr__(self):
        return u'Url {0}'.format(self.get('hash'))


class Collection(models.Collection):
    def __init__(self, models):
        super(Collection, self).__init__(Model, models)


def make_defaults(static_url='http://static.urli.st', **kwargs):
    import random

    rand_number = random.randint(1,6)

    def rand_image(rand_number, folder, resname):
        base_url = '{}/{}'.format(static_url.rstrip('/'), folder)
        filename = '0{}_{}.png'.format(rand_number, resname)

        return '{}/{}'.format(base_url, filename)

    registered_with = kwargs.get('oauth_provider', 'urlist')

    profile_image = default_profile_image
    rand_profile_cover = lambda x: rand_image(x, 'profile_covers', 'cover')

    if 'profile_image' in kwargs and not kwargs.get('profile_image', False):
        kwargs.pop('profile_image')

    defdata = {'creation_time': datetime.datetime.now(),
               'welcome': True,
               'origin_id': kwargs.get('origin_id'),
               'origin_creation_time': kwargs.get('origin_creation_time'),
               'registered_with': registered_with,
               'followers': [],
               'followed_by_users': [],
               'following_users': [],
               'notify_add_url': True,
               'notify_relist': True,
               'notify_follow_user': True,
               'notify_follow_list': True,
               'notify_suggest_url': True,
               'show_facebook_link': False,
               'pending_onboarding': True,
               'lists_amount': 0,
               'links_amount': 0,
               'profile_image': profile_image,
               'profile_cover': rand_profile_cover(rand_number)}

    defdata = dict(defdata, **kwargs)

    if not registered_with in ['facebook']:
        defdata['progress'] = ['profile_image', 'screen_name', 'short_bio']
    else:
        defdata['progress'] = ['short_bio']

    return defdata


def make_unique_username(username, db):
    import random

    if username == '':
        username = '{}'.format(random.randint(1, 999))

    username_exists = lambda x: db.users.find_one({'username': x})

    unique_username = username

    for i in range(1, 999):
        if not username_exists(unique_username) and not username == '':
            return unique_username

        unique_username = u'{}{}'.format(unique_username,
                                         random.randint(1, 999))

    return unique_username


def make_username_from_email(email, db):
    from slugify import slugify

    username = email.split('@')[0]
    username = username.lower().replace('.', '_')
    username = slugify(username).replace('-', '_')

    screen_name = username.lstrip('_').replace('_', ' ').title()

    unique_username = make_unique_username(username.replace('_', ''), db)

    return u'{}'.format(unique_username), screen_name


def username_is_valid(username):
    """
    >>> username_is_valid('foobar6')
    True
    >>> username_is_valid('foobar')
    True
    >>> username_is_valid('foo_bar')
    True
    >>> username_is_valid('foo bar')
    False
    >>> username_is_valid("Let's cook")
    False
    >>> username_is_valid("foo.bar")
    False
    >>> username_is_valid("foo-bar")
    False
    >>> username_is_valid("foo+bar")
    False
    """

    if username == '' or username is None:
        return False

    return not re.search("^[A-z][A-z|\_][A-z|\_|0-9]+$",username) == None


def write_oauth(db, user_id, token):
    oauth_data = {'urlist_id': user_id,
                  'urlist_provider': 'urlist',
                  'urlist_last_token': token}

    db.users.update({'_id': ObjectId(user_id)},
                    {'$set': oauth_data}, safe=True)


def new_token():
    return str(int(time.time()))


def token_is_valid(token):
    if not token:
        return False

    try:
        secs = int(token)
    except ValueError, TypeError:
        secs = None

    if not isinstance(secs, int):
        return False

    _token_date = time.gmtime(secs)
    token_date = datetime.date(_token_date.tm_year,
                               _token_date.tm_mon,
                               _token_date.tm_mday)

    today = datetime.date.today()
    delta = token_date - today

    if token_date > today:
        return False

    if delta >= datetime.timedelta(days=30):
        return False

    return True


if __name__ == "__main__":
    import doctest
    doctest.testmod()
