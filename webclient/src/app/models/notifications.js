model.Notifications = ul.bbext.Model.extend({

    url: function () { return API_ROOT + "/notifications?t=" + Math.random() ; },

    isReady: function () {
        return this.has("notifications");
    },

    getAmount: function () {
        if (this.isReady())
            return _.filter(this.get("notifications"), function (n) { return !n.read_at; }).length;
        else
            return 0;
    },

    parse: function (response) {
        response.notifications = response.notifications || [];
        var onlyRequests = _.filter(response.notifications, function (n) {
            return n.subject == "contrib_request" && !n.status;
        });
        response.pending = new collection.PendingNotifications(onlyRequests);
        response.total = response.pending.length;

        return response;
    }

});
