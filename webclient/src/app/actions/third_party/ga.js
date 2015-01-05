( function (broker) {

    var TRACK = window.CONFIG.ga.track;

    if (!TRACK)
        return;

    var MyAction = actions.Action.extend({

        events: {
            "profile-loaded" : "profileLoaded",

            "view-list"      : "viewList",
            "view-url"       : "viewUrl",

            "add-list"       : "addList",
            "add-url"        : "addUrl",

            "app-ready"      : "pageView",
            "page-view"      : "pageView"
        },

        profileLoaded: function (profile) {
            var u = profile.toJSON();

            if (u.__notrack && !window.CONFIG.ga.force_all) {
                console.log("disable google analytics");
                window._gaq = [];
            }

            _gaq.push(["_setCustomVar", 1, "user-status", u.is_anonymous ? "anonymous" : "registered", 2]);

            /*
            _gaq.push(["_setCustomVar",
                       2,
                       "cohort-id",
                       u.created_at
                       2]);
            */

            if (u.welcome) {
                _gaq.push(["_trackEvent", "user", "signup"]);
            }

        },

        viewList: function () {
            _gaq.push(["_trackEvent", "list", "view"]);
        },

        viewUrl: function () {
            _gaq.push(["_trackEvent", "url", "view"]);
        },

        addList: function () {
            _gaq.push(["_trackEvent", "list", "new"]);
        },

        addUrl: function () {
            _gaq.push(["_trackEvent", "url", "add"]);
        },

        pageView: function () {
            // madness? THIS IS ANALYTIIICS
            if (window.location.pathname == "/") {
                if (C.get("user").get("is_anonymous")) {
                    _gaq.push(["_trackPageview", "/?page=landing"]);
                } else {
                    _gaq.push(["_trackPageview", "/?page=network"]);
                }
            } else {
                _gaq.push(["_trackPageview"]);
            }
        }

    });

    var myAction = new MyAction(broker);
    myAction.bindToBroker();

}) (UL.Broker);

