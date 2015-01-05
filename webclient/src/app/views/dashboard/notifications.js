view.discovery.Notifications = ul.bbext.View.extend({

    events: {
        "click .js-accept-request" : "acceptRequest",
        "click .js-decline-request": "declineRequest"
    },

    initialize: function () {
        this.listenTo(C.get("notifications"), "sync", this.deferredRender);
    },

    deferredRender: function () {
        var template      = ul.util.t("dashboard/notifications"),
            notifications = this.model.get("notifications"),
            subview, subTemplate, cnot;

        this.$el.html(template({ empty: notifications.length == 0 }));

        subview = this.$("[data-view='notifications']");

        for (var i = 0; i < notifications.length; i++) {
            cnot = notifications[i];

            // Lookup the template in the notification folder
            subTemplate = ul.util.t("notification/{0}".format(cnot.subject));

            // If we don't have any template to render, log an error
            if (!subTemplate)
                console.error("Missing template for notification '{0}'".format(cnot.subject));
            else
                subview.append(subTemplate(cnot));
        }

    },

    render: function () {
        this.model.fetch({
            success: _.bind(this.deferredRender, this)
        });

        // Update the main Header, not related to the view itself
        $(".js-app-navigation li").removeClass("active");
        $(".js-app-navigation .js-notifications").addClass("active");

        return this.$el;
    },

    acceptRequest: function (e) {
        var notification   = $(e.target).closest(".js-request"),
            notificationId = notification.attr("data-request-id");

        notification.find(".js-action-toolbar .button").fadeOut("fast");
        UL.Broker.push("accept-contrib-request", { notification_id: notificationId });
    },

    declineRequest: function (e) {
        var notification   = $(e.target).closest(".js-request"),
            notificationId = notification.attr("data-request-id");

        notification.find(".js-action-toolbar .button").fadeOut("fast");
        UL.Broker.push("decline-contrib-request", { notification_id: notificationId });
    }

});
