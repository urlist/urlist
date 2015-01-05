from motherbrain.base import models
from motherbrain.base.models.processors import Compose, transform, compose

from motherbrain.models import helpers

from motherbrain.helpers import fetch

def _extract(key):
    return lambda x: compose.extract_key(x, key)

class Model(models.Model):
    fields = (
        ('user_id',             transform.MongoOidToStr),
        ('hash',                transform.DoNothing),
        ('list_hash',           transform.DoNothing),
        ('creation_time',       transform.MongoDateTimeToStr),
        ('update_time',         transform.MongoDateTimeToStr),
        ('site_metadata',       None),
        ('url_info',            None),
        ('user_metadata',       None),

        ('favicon',             transform.DoNothing),

        ('embed_handler',       transform.DoNothing),

        ('url',                 transform.DoNothing),
        ('domain',              Compose('url', using=fetch.domain_by_url, override=False)),
        ('title',               transform.DoNothing),
        ('description',         transform.DoNothing),

        ('position',            transform.DoNothing),
        ('section',             transform.DoNothing),

        ('from_list_hash',      transform.DoNothing),
        ('from_url_hash',       transform.DoNothing),
        ('from_user_id',       transform.DoNothing),

        ('relist_amount',       Compose('list_hash', 'hash', 'from_list_hash', 'from_url_hash',
                                        using=helpers.relist_amount)),

        ('relists',            Compose('list_hash', 'hash',
                                       'from_list_hash', 'from_url_hash', using=helpers.relists))
    )

    def __init__(self, data):
        super(Model, self).__init__(self.fields, data)

    def __repr__(self):
        return u'Url {list_hash}.{hash}'.format(**self)


class Collection(models.Collection):
    def __init__(self, models):
        super(Collection, self).__init__(Model, models)
