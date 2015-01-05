from motherbrain.base import models
from motherbrain.base.models.processors import Compose, transform, compose
from motherbrain.models import helpers, legacy_helpers, url


def _type(settings):
    order = settings.get('order')

    _map = {'chart': ['love', 'numeric'],
            'draft': ['recent', 'author'],
            'reference': ['color']}

    for k, v in _map.iteritems():
        if order in v:
            return k

    return 'draft'

def _comments(data):
    if not isinstance(data, list):
        return []

    def _fmt_time(time_obj):
        t = transform.MongoDateTimeToStr()
        return t(time_obj)

    return [dict(x, **{'created_at': _fmt_time(x.get('created_at'))})
            for x in data]

def _followers(followers):
    if not followers:
        return []

    return [dict(user_id=str(x)) for x in followers]


class Model(models.Model):
    fields = (
        ('_id',                 None),
        ('list_hash',           transform.DoNothing),
        ('description',         transform.DoNothing),
        ('hash',                transform.DoNothing),
        ('title',               transform.DoNothing),
        ('views_amount',        transform.DoNothing),
        ('is_secret',           transform.DoNothing),

        ('user_id',             transform.MongoOidToStr),

        ('creation_time',       transform.MongoDateTimeToStr),
        ('update_time',         transform.MongoDateTimeToStr),

        ('urls',                url.Collection),

        ('comments',            transform.DoNothing),
        ('comments',            Compose('comments', using=_comments)),

        ('contributors',        transform.DoNothing),

        ('full_url',            Compose('hash', using=helpers.full_url)),

        ('is_unlisted',         transform.DoNothing),

        ('last_visit',          [Compose('hash', using=helpers.last_visit),
                                 transform.MongoDateTimeToStr]),

        ('sections',            transform.DoNothing),

        ('followers',           Compose('followers', using=_followers)),
        ('followers_amount',    Compose('followers', using=compose.count)),
        ('following',           Compose('followers', 'contributors', using=helpers.is_favorited)),

        ('links_amount',        Compose('urls', using=compose.count)),
        ('relist_amount',       Compose('hash', using=helpers.list_relist_amount)),

        ('categories',          transform.DoNothing),

        ('type',                Compose('settings', using=_type, override=False)),
        ('slug',                transform.DoNothing)
    )

    def __init__(self, data):
        super(Model, self).__init__(self.fields, data)

    def __len__(self):
        return len(self.get('urls'))

    def __repr__(self):
        return u'List {}, {}'.format(self.get('hash'),
                                     self.get('title'))


class Collection(models.Collection):
    def __init__(self, models):
        super(Collection, self).__init__(Model, models)

