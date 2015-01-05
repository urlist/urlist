//Defines the functionality of the header, the bar on the top
view.Header = ul.bbext.View.extend({

    events: {
        "click .js-notifications"     : "openNotifications",

        "submit .js-search-form"      : "searchGlobally",
        "click .js-search-globally"   : "searchGlobally",
        "click .js-search-in-library" : "searchLocally",
        "click .js-search-input"      : "showSearchMenu",
        "keyup .js-search-input"      : "showSearchFilter"
    },

    initialize: function () {
        this.template = ul.util.t("header/header");
        //Keep the notifications in sync - for when you're invited to a list
        this.listenTo(C.get("notifications"), "sync", this.updateCounter);
        this.listenTo(C.get("notifications"), "sync", this.renderNotifications);
        this.listenTo(C.get("notifications"), "sync", this.updateCounterTitle);
        this.listenTo(C.get("user"), "change", this.render);
    },

    searchGlobally: function () {
        var value = this.$("input.js-search-input").val();
        UL.Router.navigate("/search/{0}".format(encodeURIComponent(value)), {trigger: true} );

        return false;
    },

    searchLocally: function () {
        var value = this.$("input.js-search-input").val();
        UL.Router.navigate("/search/me/{0}/links".format(value), {trigger: true} );

        return false;
    },

    renderNotifications: function () {
        if (this.$(".js-dropdown--notifications").is(":visible")) return;

        var notifications = C.get("notifications").get("notifications"),
            length = notifications ? notifications.length : 0,
            template = ul.util.t("header/notifications"),
            $html = $(template({ render: length })),
            $nl = $html.find(".notification-list"),
            subTemplate, cnot;

        for (var i = 0; i < length; i++) {
            cnot = notifications[i];

            // Lookup the template in the notification folder
            subTemplate = ul.util.t("notification/{0}.mini".format(cnot.subject));

            // If we don't have any template to render, log an error
            if (!subTemplate)
                console.error("Missing template for notification '{0}'".format(cnot.subject));
            else
                $nl.append(subTemplate(cnot));
        }

        this.$(".js-notifications .dropdown").remove();
        this.$(".js-notifications").append($html);

        var pos = $(window).scrollTop();

        // Avoid the annoying scroll-on-scroll when reaching the bottom of $nl
        $nl.on({
            mouseenter: function() {
                $("body").addClass("ac--freeze");
            },
            mouseleave: function() {
                $("body").removeClass("ac--freeze");
            }
        });

    },

    render: function () {
        var json = this.model.toJSON(),
            savedSearchesView = new view.dashboard.SavedSearches({
                collection: C.get("user").get("saved_searches")
            });

        json.multiple_master       = $.cookie("ul.config.branch");
        json.notifications_counter = C.get("notifications").get("total");
        json.facebook_url          = API_ROOT + "login/facebook?next=" + encodeURIComponent(window.location.href);

        this.$el.html( this.template(json) );

        this.documentScript();

        this.$(".js-saved-searches").html(savedSearchesView.render());

        return this.$el;
    },

    openNotifications: function () {
        UL.Broker.push("notifications-ack");
    },

    updateCounter: function (notificationModel) {
        var total = notificationModel.getAmount();

        this.$(".js-notifications-counter").attr("data-count", (total > 9 ? "9+" : total));
    },

    updateCounterTitle: function (notificationModel) {
        var total = notificationModel.getAmount();

        setNotifCountDocumentTitle(total);
    },

    showSearchMenu: function (e) {
        // Act as focus/blur, but in this way it's more controllable
        $(e.target).addClass("focused");
        $(e.target).select();
        // Display the search CTAs/saved searches
        this.$(".search_cta-list").addClass("show");
    },

    showSearchFilter: function (e) {
        this.$(".ac-cutted").addClass("ac-cutted-off");
        this.$(".search_cta-list").addClass("show");
    },

    //documentScript is ran right before the render.
    //It cleans up some stuff
    documentScript: function () {
        // Change UX if device is touch
        if(Modernizr.touch) {
            this.$(".js-nav-item > a").removeClass("js-navigate").addClass("js-noop js-toggle-menu");
        }

        // Wait 1000ms, then run the UL.Broker.trigger function
        var documentBottomTrigger = _.debounce( function () { UL.Broker.trigger("document-bottom"); }, 1000, true ),
            atBottom = false,
            header = this.$el.find(".header-app"),

            windowHeight = $(window).height();

        // Toggle the [scroll to top] sticker
        $(window).scroll(function(){

            var scrollHeight = $(window).scrollTop();

            if (scrollHeight > (windowHeight/2)) {
                this.$(".sticker-scrollTop").addClass("active");
            } else {
                this.$(".sticker-scrollTop").removeClass("active");
            }

            if($(window).scrollTop() + $(window).height() > $(document).height() - 200) {
                if (!atBottom) {
                    atBottom = true;
                    documentBottomTrigger();
                }
            } else {
                atBottom = false;
            }

        });
    }

});

