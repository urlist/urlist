view.discovery.FollowMore = ul.bbext.View.extend({

    initialize: function () {
        this.autoload       = true;
        this.model          = new model.DiscoveryTopUsers();
        this.LIMIT          = 5;
        this.toRenderLater  = [];

        if (this.autoload)
            this.listenTo(UL.Broker, "document-bottom", this.renderWidgets);

    },

    renderProfile: function (user) {
        var that = this;

        // You can use `renderProfile` in two different ways:
        // 1) passing an explicit user to render, and this is cool;
        // 2) without any parameter. In the latter case the method will
        // lookup in the `toRenderLater` property if there is a profile
        // to render.
        user = user || this.toRenderLater.pop();
        if (!user) return;

        user.whenReady().done(function () {
            var profileView = new view.discovery.Profile({ model: user }),
                hook = that.$("[data-view='follow']");

            hook.append(profileView.render());

            profileView.once("follow-user", that.renderProfile, that);
        });
    },

    renderWidgets: function () {
        // Render some profiles.
        // The method will take care to limit the number
        // of profiles displayed.

        for (var i = 0; i < this.LIMIT; i++)
            this.renderProfile();
    },

    render: function () {
        var that     = this,
            template = ul.util.t("discovery/follow"),
            json     = { display_following     : C.get("user").get("following_users").length < 5,
                         following_users_count : C.get("user").get("following_users").length };

        this.$el.html(template(json));
        this.documentScript();
        this.model.whenReady().done(function () {
            // Copy the list of profiles in a new array for later use
            that.toRenderLater  = that.model.get("users").models.slice();

            that.renderWidgets();
        });
    },

    documentScript: function () {
        // Check if it is a touchscreen
        if(Modernizr.touch || $(".is-stickyarea").length == 0) return false;

        var stickyEl    = $(".is-stickyarea"),
            stickyClass = "active-sticky",
            stickyOffY  = stickyEl.offset().top,
            scrollOffY  = $(window).scrollTop();

        function detectSticky () {
            scrollOffY = $(window).scrollTop();

            if (scrollOffY > stickyOffY) {
                stickyEl.addClass(stickyClass);
            } else {
                stickyEl.removeClass(stickyClass);
            }
        }

        detectSticky();

        $(window).on("scroll", function () {
            detectSticky();
        });
    }

});

