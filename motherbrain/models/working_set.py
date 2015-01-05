from motherbrain import models
from motherbrain.base import models
from motherbrain.base.models.processors import Compose, transform, compose


class Model(models.Model):
    fields = (
        ('creation_time',       transform.MongoDateTimeToStr),
        ('update_time',         transform.MongoDateTimeToStr),
        ('hash',                transform.DoNothing),
        ('title',               transform.DoNothing),
        ('type',                transform.DoNothing),
        ('user_id',             transform.DoNothing),
        ('is_secret',           transform.DoNothing),

        ('urls',                None),

        ('links_amount',        Compose('urls', using=compose.count)),
    )

    def __init__(self, data):
        super(Model, self).__init__(self.fields, data)

    def __len__(self):
        return len(self.get('urls'))


class Collection(models.Collection):
    def __init__(self, models):
        super(Collection, self).__init__(Model, models)

    def __repr__(self):
        return u'Working set'.format(self.get('hash'))
