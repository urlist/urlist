from motherbrain.base import models
from motherbrain.base.models.processors import Compose, transform, compose

from motherbrain.models import helpers

def _sender_data(key):
    return lambda x: helpers.get_userdata(x, key)

def _list_data(key):
    return lambda x: helpers.get_listdata(x, key)


class Model(models.Model):
    fields = (
        ('_id',                 None),
        ('notification_id',     [Compose('_id', using=lambda x: x),
                                 transform.MongoOidToStr]),

        ('user_id',             transform.MongoOidToStr),
        ('sender_id',           transform.MongoOidToStr),
        ('list_hash',           transform.DoNothing),
        ('status',              transform.DoNothing),
        ('accepted_at',         transform.MongoDateTimeToStr),
        ('invited_at',          transform.MongoDateTimeToStr),

        ('sender_username',  Compose('sender_id', using=_sender_data('username'))),
        ('sender_screen_name',  Compose('sender_id', using=_sender_data('screen_name'))),
        ('list_title',          Compose('list_hash', using=_list_data('title'))),

        ('sender_profile_image',  Compose('sender_id', using=_sender_data('profile_image'))),
        ('list_type',             Compose('list_hash', using=_list_data('type'))),

        ('links_amount',          Compose('list_hash', using=_list_data('links_amount'))),
    )

    def __init__(self, data):
        super(Model, self).__init__(self.fields, data)


class Collection(models.Collection):
    def __init__(self, models):
        super(Collection, self).__init__(Model, models)
