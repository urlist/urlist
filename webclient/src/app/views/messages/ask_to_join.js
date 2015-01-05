view.message.AskToJoin = ul.bbext.View.extend({

    events: {
        "click .js-message-close"  : "unbindMe",
        "click .js-message-accept" : "accept",
        "click .js-message-decline": "decline"

    },

    template: "messages/ask_to_join",

    render: function () {
        var t = ul.util.t("messages/ask_to_join");
        this.$el.html(t(this.notification));
        $("#urlist-content").append(this.$el);
    },

    getNotificationId: function () {
        var hash = this.model.get("hash"),
            notification;

        notification = _(C.get("notifications").get("notifications")).find(function (n) {
                return n.subject == "contrib_request" && n.data.list_hash == hash; });

        return notification.data.notification_id;
    },

    accept: function () {
        var that = this;

        UL.Broker.push("accept-contrib-request", { notification_id: this.getNotificationId() })
            .done(function () {
                UL.Router.list(that.model.get("hash"), true);
            });

        this.unbindMe();
    },

    decline: function () {
        var that = this;

        UL.Broker.push("decline-contrib-request", { notification_id: this.getNotificationId() })
            .done(function () {
                UL.Router.list(that.model.get("hash"), true);
            });

        this.unbindMe();
    }

});
