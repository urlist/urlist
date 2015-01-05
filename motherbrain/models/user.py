from motherbrain.base import models
from motherbrain.base.models.processors import Compose, transform, compose

from motherbrain.models import helpers

def _profile_image(model_data):
    urlist_img, fb_img, twitter_img = model_data

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
        ('facebook_profile_img', None),
        ('twitter_profile_img', None),

        ('profile_image', Compose('profile_image', 'facebook_profile_img', 'twitter_profile_img', using=_profile_image)),
        ('profile_image_small', transform.DoNothing),

        ('__notrack',    transform.DoNothing),

        ('is_anonymous', transform.DoNothing),
    )

    def __init__(self, data):
        super(Model, self).__init__(self.fields, data)

    def __repr__(self):
        return u'Url {0}'.format(self.get('hash'))


class Collection(models.Collection):
    def __init__(self, models):
        super(Collection, self).__init__(Model, models)
