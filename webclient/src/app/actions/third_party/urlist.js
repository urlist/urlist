// target, model, tracker, source, payload

( function (broker) {

    var Tracker = function (source) {
        this.source = source;
        this.active = true;
    };

    _.extend(Tracker.prototype, {
        t: function (tracker, d) {
            if (!this.active)
                return;

            d.source  = this.source;
            d.tracker = tracker;
            $.ajax({
                url: API_ROOT + "tracker",
                type: "POST",
                data: JSON.stringify( _.purge(d) ),
                contentType: "application/json",
                dataType: "json",
                xhrFields: { withCredentials: true }
            });
        },

        disable: function () {
            this.active = false;
        }
    });

    var ut = new Tracker("web");
    UT = ut;

    var TRACK = CONFIG.ut.track;

    if (!TRACK)
        return;

    var MyAction = actions.Action.extend({

        events: {
            "profile-loaded" : "profileLoaded",

            "global-search"  : "globalSearch",
            "local-search"   : "localSearch",

            "app-ready"      : "pageView",
            "page-view"      : "pageView",

            "view-list"      : "viewList",
            "view-url"       : "viewUrl",

            "view-discovery" : "viewDiscovery",

            "add-list"       : "addList",
            "add-url"        : "addUrl",
            "relist-url"     : "relistUrl",
            "add-contributor": "addContributor",

            "suggest-url"           : "suggestUrl",
            "suggested-url-accept"  : "acceptSuggestedUrl",
            "suggested-url-decline" : "declineSuggestedUrl",

            "share-list"     : "shareList",
            "share-url"      : "shareUrl",

            "follow-user"    : "followUser",
            "unfollow-user"  : "unfollowUser",
            "follow-list"    : "followList",
            "unfollow-list"  : "unfollowList",

            "view-profile"   : "viewProfile",
            "update-profile" : "updateProfile",

            "update-categories": "updateCategories",
            "update-list-cover": "updateListCover",

            "accept-contrib-request" : "acceptContribRequest",
            "decline-contrib-request": "declineContribRequest",

            "preboarding-submit" : "preboardingSubmit"
        },

        profileLoaded: function (profile) {
            var u = profile.toJSON();

            if (u.welcome)
                ut.t("signup", { model: "user" });
            else
                ut.t("new_session",  { model: "user" });
        },

        globalSearch: function (query) {
            ut.t("global_search", { model: "search", target: query });
        },

        localSearch: function (query) {
            ut.t("local_search", { model: "search", target: query });
        },

        pageView: function () {
            ut.t("view", { model: "page", target: window.location.href });
        },

        viewList: function (urlistModel, originator) {
            ut.t("view", { model: "list", target: urlistModel.get("hash") });
        },

        viewUrl: function (urlistModel, urlHash) {
            ut.t("view", {
                model: "url",
                target: [urlistModel.get("hash"), urlHash.get("hash")].join("/")
            });
        },

        viewDiscovery: function () {
            ut.t("view", { model: "site", target: "discovery" });
        },


        addList: function (target, payload, deferred, extras, originator) {
            deferred.done(function (data) {
                ut.t("new", { model: "list", target: data.hash });
            });
        },

        addUrl: function (target, payload, deferred, extras) {
            deferred.done(function (data) {
                ut.t("add", {
                    model: "url",
                    target: [target.list_hash, data.hash].join("/")
                });
            });
        },

        relistUrl: function (target, payload, deferred, extras, originator) {
            ut.t("relist", {
                model: "list",
                target: target.list_hash,
                payload: { from_list_hash: payload.from_list_hash }
            });
        },

        addContributor: function (target, payload) {
            ut.t("add_contributor", {
                model: "list",
                target: target.list_hash,
                payload: {user_id: payload.user_id }
            });
        },

        suggestUrl: function (target, payload) {
            ut.t("suggest_url", {
                model: "list",
                target: target.list_hash,
                payload: {url: payload.url, description: payload.description}
            });
        },

        acceptSuggestedUrl: function (target) {
            ut.t("suggested_url_accept", {
                model: "list",
                target: target.list_hash
            });
        },

        declineSuggestedUrl: function (target) {
            ut.t("suggested_url_decline", {
                model: "list",
                target: target.list_hash
            });
        },

        shareList: function (target, payload, deferred, extras) {
            ut.t("share", { model: "list", target: target.list_hash,
                            payload: { "channel": extras.channel,
                                       "source": extras.source } });
        },

        shareUrl: function (target, payload, deferred, extras) {
            ut.t("share", { model: "url", target: target.list_hash,
                            payload: { "channel": extras.channel,
                                       "source": extras.source } });
        },

        followUser: function (target, x, x, x, originator) {
            ut.t("follow_user", { model: "user", target: target.user_id });
        },

        unfollowUser: function (target, x, x, x, originator) {
            ut.t("unfollow_user", { model: "user", target: target.user_id });
        },

        followList: function (target, x, x, x, originator) {
            ut.t("follow_list", { model: "list", target: target.list_hash });
        },

        unfollowList: function (target, x, x, x, originator) {
            ut.t("unfollow_list", { model: "list", target: target.list_hash });
        },

        viewProfile: function (profileModel, originator) {
            profileModel.whenReady().done(function () {
                ut.t("view", { model: "user", target: profileModel.get("user_id") });
            });
        },

        updateProfile: function (target, payload) {
            ut.t("update", { model: "user" });
        },

        updateCategories: function (target) {
            ut.t("update_categories", { model: "list", target: target.list_hash });
        },

        updateListCover: function (target) {
            ut.t("update_cover", { model: "list", target: target.list_hash });
        },

        acceptContribRequest: function (target) {
            ut.t("contrib_accept", { model: "list", target: target.list_hash });
        },

        declineContribRequest: function (target) {
            ut.t("contrib_decline", { model: "list", target: target.list_hash });
        },

        preboardingSubmit: function (title) {
            ut.t("preboarding", { model: "user", title: title });
        }

    });

    var myAction = new MyAction(broker);
    myAction.bindToBroker();

}) (UL.Broker);

