collection.PendingNotifications = ul.bbext.Collection.extend({

    url: API_ROOT + "__message/fetch-contrib-notifications",

    model: model.PendingNotification

});

