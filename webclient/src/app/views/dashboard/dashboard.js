view.dashboard.Dashboard = ul.bbext.View.extend({

    events: {
        // Dashboard Callbacks
        "click .js-alert_close"                : "closeAlert",

        // Callbacks for Follow button
        "click .js-follow-user"                : "followUser",
        "click .js-unfollow-user"              : "unfollowUser",

        // They say we're mergin with profile!
        "click .js-followers-stats"            : "showFollowers",
        "click .js-following-stats"            : "showFollowing"
    },

    initialize: function () {
        this.template = ul.util.t("dashboard/dashboard");
        this.model = this.model || ul.util.getCurrentProfile();
        this.model.whenReady().done(
                _.bind(this.deferredInitialize, this)
        )
        // this.listenTo(C.get("notifications"), "sync", this.updatePendingCounter);
        this.currentView = null;
    },

    deferredInitialize: function () {
        this.listenTo(this.model.get("lists"), "add remove", this.updateListsCounter);
        this.listenTo(this.model.get("followed_lists"), "add remove", this.updateFollowedListsCounter);
        this.listenTo(this.model.get("following_users"), "add remove", this.updateFollowingUsersCounter);
    },

    showFollowing: function (evt) {
        var dialog = new view.dialog.ShowListFollowing({
            collection: this.model.get("following_users"),
            dialogClass: "dialog-mini dialog-list-following",
            title: "Following",
            closeOnOverlay: true
        });

        evt.preventDefault();

        dialog.render();
    },

    showFollowers: function (evt) {
        var dialog = new view.dialog.ShowListFollowers({
            collection: this.model.get("followed_by_users"),
            dialogClass: "dialog-mini dialog-list-followers",
            title: "Followers",
            closeOnOverlay: true
        });

        evt.preventDefault();

        dialog.render();
    },

    cleanUp: function () {
        // Dismiss Search dropdown within the Library
        $(".search_cta-list").removeClass("show");
        // Dismiss every dropdown menus
        $(".dropdown").removeClass("is--active");

        if (this.currentView) {
            var height = this.$(".js-dashboard-content").height();

            this.currentView.unbindMe();

            this.$(".js-dashboard-page").append(
                $("<div>", { "class": "js-dashboard-content",
                             "style": "height: {0}px".format(height) }));
        }
    },

    closeAlert: function (e) {
        $(e.target).closest(".js-alert").slideUp(150, function() { $(this).remove(); });

        e.preventDefault();
    },

    renderLists: function (lists, key, subkey) {
        this.cleanUp();

        var widgetListView = new view.widget.WidgetList({
            collection: lists,
            el: this.$(".js-dashboard-content"),
            limit: 20
        });

        this.currentView = widgetListView;

        // Update the main toggle [lists*|bookmarks|activity]
        this.$(".js-dashboard-nav li").removeClass("active");
        this.$(".js-dashboard-nav .js-my-" + key).addClass("active");

        // Hide the sub toggle [all|authored|joined] when in [lists*|bookmarks|activity]
        if (key == "lists") {
            this.$(".js-changedisplay").removeClass("hide");
        } else {
            this.$(".js-changedisplay").addClass("hide");
        }

        // Update the sub toggle [all*|authored|joined]
        if (subkey != undefined) {
            this.$(".js-changedisplay-switcher .js-route").siblings().removeClass("active");
            this.$(".js-changedisplay-switcher .js-route-" + subkey).addClass("active");
        }

        widgetListView.render();

        if (lists.length == 0) {
            this.$(".js-dashboard-content").html(
                $(ul.util.t("dashboard/empty_lists")({is_mine: this.model.isMine() }))
            );
        }
    },

    renderAll: function () {
        this.renderLists(this.model.get("lists"), "lists", "all");
    },

    renderAuthored: function () {
        var userId = this.model.get("user_id"),
            lists  = this.model.get("lists");

        this.renderLists(lists.filterByUser(userId), "lists", "authored");
    },

    renderJoined: function () {
        var userId = this.model.get("user_id"),
            lists  = this.model.get("lists");

        this.renderLists(lists.filterOutUser(userId), "lists", "joined");
    },

    renderBookmarks: function () {
        this.renderLists(this.model.get("followed_lists"), "bookmarks");
    },

    renderFollows: function () {
        var followingPeopleView = new view.dashboard.People({
                collection: C.get("user").get("following_users")
            }),

            followedByPeopleView = new view.dashboard.People({
                collection: C.get("user").get("followed_by_users")
            });

        this.$(".js-followed-by-users").html(followedByPeopleView.render());
        this.$(".js-following-users").html(followingPeopleView.render());
    },

    render: function () {
        var json = this.model.toJSON({ calculated: true });

        json.progress_num = 4 - json.progress.length;
        json.progress_tot = 4;

        this.cleanUp();

        this.$el.html(this.template(json));

        this.renderFollows();

        this.trigger("widgetReady");

        this.documentScript();
    },

    updateListsCounter: function () {
        this.$(".js-my-lists-counter").text( this.model.get("lists").length );
    },

    updateFollowedListsCounter: function () {
        this.$(".js-following-lists-counter").text( this.model.get("followed_lists").length );
    },

    updateFollowingUsersCounter: function () {
        this.$(".js-following-users-counter").text( this.model.get("following_users").length );
    },

    toggleFollow: function (e) {
        e.preventDefault();

        this.$(".user-actions").toggleClass("status-following").addClass("following-new");
        this.$(".user-actions").one("mouseleave", function () { $(this).removeClass("following-new"); });
    },

    followUser: function (e) {
        if (ul.dialog.requireSignup()) return false;

        // XXX: must be refactored soon
        UL.EventOriginator.push(e.getSource());

        UL.Broker.push(
            "follow-user",
            { user_id: this.model.get("user_id") },
            { },
            { username: this.model.get("username") });

        this.toggleFollow(e);

        return false;
    },

    unfollowUser: function (e) {
        // XXX: must be refactored soon
        UL.EventOriginator.push(e.getSource());

        UL.Broker.push(
            "unfollow-user",
            { user_id: this.model.get("user_id") },
            { },
            { username: this.model.get("username") });

        this.toggleFollow(e);

        return false;
    },

    documentScript: function () {
        // Update the main Header, not related to the view itself
        $(".js-app-navigation li").removeClass("active");
        $(".js-app-navigation .js-item-library").addClass("active");
    },

    _unbindMe: function () {
        this.cleanUp();
    }

});
