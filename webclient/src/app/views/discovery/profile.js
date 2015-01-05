view.discovery.Profile = ul.bbext.View.extend({

    className: "profile-item js-profile-item",

    events: {
        "click .js-user-follow"         : "followUser",
        "click .js-trigger-user-follow" : "showFollowUser"
    },

    render: function () {
        var template = ul.util.t("widget/profile")
            that     = this;

        this.$el.html(template(this.model.toJSON()));

        _.each(this.model.get("lists").first(3), function (urlist) {
            var urlistView = new view.widget.Widget({ model: urlist });
            that.$("[data-view='lists']").append(urlistView.render());
        });

        return this.$el;
    },

    followUserCallback: function (e) {
        var progressCount = parseInt($(".js-progressbar").attr("data-progress")),
            progressTotal = parseInt($(".js-progressbar").attr("data-total"));

        progressCount++

        var progressComplete = progressCount >= progressTotal;

        $(".js-progressbar").attr({"data-progress": progressCount, "data-complete" : progressComplete});

        if (progressComplete)
            $(".js-progressbar").siblings(".js-toggle").addClass("js-switch");

        UL.EventOriginator.push(e.getSource(e));

        this.trigger("follow-user");

        UL.Broker.push(
            "follow-user",
            { user_id: this.model.get("user_id") },
            { },
            { username: this.model.get("username") });
    },

    followUser: function (e) {
        if (ul.dialog.requireSignup()) return false;

        // Trigger .showFollowUser() the proper way
        $(e.target).parents(".js-profile-item").find(".js-trigger-user-follow").trigger("click", true);
        return false;
    },

    showFollowUser: function (e) {
        if (ul.dialog.requireSignup()) return false;

        // Fire the real following action and make the progressbar grow
        this.followUserCallback(e);

        // Add visual feedback of the action
        $(e.target).closest(".js-trigger-user-follow").addClass("active");

        // Prevent the Profile Card to be "followed" several time (visually)
        $(e.target).removeClass("js-trigger-user-follow");
        $(e.target).parents(".js-profile-item").find(".cardlist-shield").addClass("inhibit");

        // Dismiss the Profile Card
        $(e.target).parents(".js-profile-item").delay(500).slideUp(250);

        return false;
    }

});

