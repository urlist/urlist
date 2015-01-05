view.discovery.Discovery = ul.bbext.View.extend({

    events: {
        "click .js-slide--trigger" : "openSlide",
        "click .js-dismiss-welcome": "dismissWelcome"
    },

    initialize: function () {
        this.listenTo(C.get("notifications"), "sync", this.updatePendingCounter);
    },

    cleanUp: function () {
        // Dismiss every dropdown menus
        $(".dropdown").removeClass("is--active");

        if (this.currentView) {
            this.currentView.unbindMe();

            // restore the data-view content
            if (this.$("[data-view='content']").length == 0)
                this.$("[data-view='discovery']").append($("<div class='discovery-content clearfix' data-view='content' />"));
        }
    },

    dismissWelcome: function () {
        $.removeCookie("_ul_show_welcome_on_network");
        this.$(".js-welcome-message").fadeOut();
    },

    openSlide: function (e) {
        $(e.target).closest(".js-slide").addClass("active");
        return false;
    },

    renderWidgets: function (urlistCollection, $el, $customEl, showloader, View) {
        var widgetListView = new view.widget.WidgetList({
            collection      : urlistCollection,
            el              : $el,
            customBlockFirst: $customEl,
            autoload        : false,
            showloader      : showloader,
            View            : View
        });

        widgetListView.render();

        return widgetListView;
    },

    renderMain: function () {
        this.cleanUp();

        var that         = this;
        var template     = ul.util.t("category/popular");
        var popularModel = new model.DiscoveryPopular();

        this.$el.html(template());

        popularModel.whenReady().done(function () {
            that.renderWidgets(
                popularModel.get("lists"),
                that.$("[data-view='popular']"), null,
                true);
        });

        // Update the sub Header
        this.$(".js-toolbar li").removeClass("active");
        this.$(".js-toolbar .top").addClass("active");

        // Update the main Header, not related to the view itself
        $(".js-app-navigation li").removeClass("active");
        $(".js-app-navigation .js-item-network").addClass("active");
    },

    renderNetwork: function () {
        this.cleanUp();

        var that         = this;
        var template     = ul.util.t("discovery/network");
        var networkModel = new model.DiscoveryNetwork();
        var json         = {
                // welcome           : $.cookie("_ul_show_welcome_on_network"),
                username          : C.get("user").get("username"),
                display_following : C.get("user").get("following_users").length < 5,
                has_following     : C.get("user").get("following_users").length > 0
            };

        this.$("[data-view='content']").html(template(json));

        networkModel.whenReady().done(function () {
            that.currentView = that.renderWidgets(
                networkModel.get("lists"),
                that.$("[data-view='network']"), null,
                true);
        });

        // Update the sub Header
        this.$(".js-toolbar li").removeClass("active");
        this.$(".js-toolbar .network").addClass("active");

        // Update the main Header, not related to the view itself
        $(".js-app-navigation li").removeClass("active");
        $(".js-app-navigation .js-item-network").addClass("active");
    },

    renderNetworkLinks: function () {
        this.cleanUp();

        var that         = this,
            template     = ul.util.t("discovery/network"),
            json         = {
                            display_following : C.get("user").get("following_users").length < 5,
                            has_following     : C.get("user").get("following_users").length > 0
                        },
            linksModel   = new model.DiscoveryNetworkUrls();

        this.$("[data-view='content']").html(template(json));

        linksModel.whenReady().done(function () {
            that.currentView = that.renderWidgets(
                linksModel.get("urls"),
                that.$("[data-view='network']"), null,
                true, view.widget.Url);
        });

        // Control switcher status change
        this.$(".js-changedisplay-switcher .state-a").removeClass("active").siblings().addClass("active");

        // Update the sub Header
        this.$(".js-toolbar li").removeClass("active");
        this.$(".js-toolbar .network").addClass("active");

        // Update the main Header, not related to the view itself
        $(".js-app-navigation li").removeClass("active");
        $(".js-app-navigation .js-item-network").addClass("active");
    },

    renderFollow: function () {
        this.cleanUp();

        var that        = this;
        var template    = ul.util.t("discovery/follow");
        var followModel = new model.DiscoveryTopUsers();
        var followView  = new view.discovery.FollowMore({
                el: this.$("[data-view='content']")
            });

        this.currentView = followView;

        followView.render();

        // Update the sub Header
        this.$(".js-toolbar li").removeClass("active");
        this.$(".js-toolbar .follow").addClass("active");

        // Update the main Header, not related to the view itself
        $(".js-app-navigation li").removeClass("active");
        $(".js-app-navigation .js-item-network").addClass("active");
    },

    renderActivity: function () {
        this.cleanUp();

        var notificationsView = new view.discovery.Notifications({
            model: C.get("notifications"),
            // el: this.$(".js-dashboard-content")
            el: this.$("[data-view='content']")
        });


        // Why do we save notificationsView into this.currentView???
        // Alberto: is the same pattern as the router
        this.currentView = notificationsView;

        UL.Broker.push("notifications-ack");

        this.$(".js-toolbar li").removeClass("active");
        this.$(".js-toolbar .js-activity").addClass("active");

        notificationsView.render();
    },

    updatePendingCounter: function () {
        var notifLength  = C.get("notifications").getAmount(),
            notifCounter = this.$(".js-pending-counter");

        notifCounter.attr("data-count", (notifLength > 9 ? "9+" : notifLength));
    },

    render: function () {
        var template = ul.util.t("discovery/layout"),
            that = this,
            notifLength = C.get("notifications").getAmount(),
            json = { notifications_amount : notifLength > 9 ? "9+" : notifLength };

        $("#footer").removeClass("hide");

        this.$el.html(template(json));

    }

});

