from motherbrain.base import models
from motherbrain.base.models.processors import Compose, transform, compose


class Model(models.Model):
    fields = (
        ('user_id',             transform.MongoOidToStr),
        ('relisted_at',         transform.MongoDateTimeToStr),
        ('target_list_hash',    transform.DoNothing),
    )

    def __init__(self, data):
        super(Model, self).__init__(self.fields, data)

    def __repr__(self):
        return u'Url {list_hash}.{hash}'.format(**self)


class Collection(models.Collection):
    def __init__(self, models):
        super(Collection, self).__init__(Model, models)
