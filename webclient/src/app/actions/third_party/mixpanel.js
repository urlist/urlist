( function (broker) {

    var TRACK = window.CONFIG.mixpanel.track;

    if (!TRACK)
        return;

    var MyAction = actions.Action.extend({

        events: {
            "profile-loaded" : "profileLoaded",

            "global-search"  : "globalSearch",
            "local-search"   : "localSearch",

            "view-landing"   : "viewLanding",
            "start-onboarding": "startOnboarding",

            "view-list"      : "viewList",
            "view-url"       : "viewUrl",

            "view-discovery" : "viewDiscovery",

            "add-list"       : "addList",
            "add-url"        : "addUrl",
            "relist-url"     : "relistUrl",
            "add-comment"    : "addComment",
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

            "preboarding-slide" : "preboardingSlide",
            "preboarding-submit" : "preboardingSubmit"
        },

        profileLoaded: function (profile) {
            var u = profile.toJSON(),
                signupSource;

            if (u.__notrack && !window.CONFIG.mixpanel.force_all) {
                console.log("disable mixpanel");
                mixpanel.disable();
                return;
            }

            if (window.CONFIG.mixpanel.debug)
                mixpanel.set_config({
                    debug: true
                });

            // cleanup, dunno if this is useful or not, anyway
            // should avoid having dirty data
            mixpanel.unregister("is_anonymous");

            mixpanel.identify( u.origin_id || u.user_id );
            mixpanel.register_once({ "ab_group": profile.ABGroup() });
            mixpanel.name_tag( "{0} - {1}".format(u.username, u.email) );

            if (u.is_anonymous) {
                mixpanel.register_once({ "is_anonymous": true });
            } else {

                mixpanel.people.set(_.purge({
                    "$name"   : u.screen_name,
                    "$email"  : u.email,
                    "$created": u.creation_time,
                    "profile" : "http://urli.st/library/" + u.username,
                    "links"   : u.links_amount,
                    "lists"   : u.lists_amount,
                    "location": u.location,
                    "google"  : u.google_username,
                    "facebook": "https://www.facebook.com/" + u.facebook_username,
                    "twitter" : "https://twitter.com/" + u.twitter_username
                }));
            }

            if (u.welcome) {
                // OK, so the user just signed in, we need to check if there
                // are some special values in the cookie set by the client
                // and do something with them.
                // The behaviour is hardcoded, but we have just one case
                // to manage now, and is useless to generalize.
                //
                // `_ul_signup_source` is set only by the "aggressive signup dialog",
                // we need this value to understand if users are really signing up
                // using that dialog.

                var source = $.cookie("_ul_signup_source");

                // Clean up the cookie!
                $.removeCookie("_ul_signup_source");

                // Track on mixpanel the signup, and the source if set
                mixpanel.track("User:signup", _.purge({ source: source }, null));

            }

        },

        globalSearch: function (query) {
            mixpanel.track("Search:global", { query: query });
        },

        localSearch: function (query) {
            mixpanel.track("Search:local", { query: query });
        },

        viewLanding: function () {
            mixpanel.track("Landing:view");
        },

        startOnboarding: function () {
            if (C.get("user").isNewbie())
                mixpanel.track("Onboarding:start");
        },

        viewList: function (urlistModel, originator) {
            urlistModel.whenReady().done(function () {
                var properties = { is_owner: urlistModel.isMine() };

                _.extend(properties, originator);

                mixpanel.track("List:view", properties);
            });
        },

        viewUrl: function (urlistModel) {
            urlistModel.whenReady().done(function () {
                mixpanel.track("Url:view",
                    { is_owner: urlistModel.isMine() });
            });
        },

        viewDiscovery: function () {
            mixpanel.track("Discovery:view");
        },

        addList: function (target, payload, deferred, extras, originator) {
            var properties = {
                "list_index": C.get("user").getListsByMe().length,
                "is_secret": payload.is_secret
            };

            _.extend(properties, originator);
            mixpanel.track("List:new", properties);
        },

        addUrl: function (target, payload, deferred, extras) {
            var urlist = new ul.model.Urlist({ hash: target.list_hash }),
                d = { "source": _.get(extras, "source"),
                      "is_owner": urlist.isMine() };

            _.extend(d, extras);
            mixpanel.track("Url:add", d);
        },

        moveUrlToAnotherList: function (target, payload, deferred) {
            deferred.done(function () {
                mixpanel.track("Url:move_to_another_list");
            });
        },

        relistUrl: function (target, payload, deferred, extras, originator) {
            deferred.done(function () {
                var toUrlistModel   = new ul.model.Urlist({ hash: target.list_hash }),
                    fromUrlistModel = new ul.model.Urlist({ hash: payload.from_list_hash });

                toUrlistModel.whenReady().done(function () {
                    fromUrlistModel.whenReady().done(function () {
                        var properties = {
                            "from_is_owner": fromUrlistModel.isMine(),
                            "to_is_owner": toUrlistModel.isMine()
                        };

                        _.extend(properties, originator);

                        mixpanel.track("Url:relist", properties);
                    });
                });
            });
        },

        addComment: function (target, payload, deferred) {
            var urlistModel = new ul.model.Urlist({ hash: target.list_hash });

            mixpanel.track("List:comment_add", { "is_owner": urlistModel.isMine() });
        },


        addContributor: function (target, payload) {
            var urlistModel = new ul.model.Urlist({ hash: target.list_hash });

            mixpanel.track("List:contributor_add", { "is_owner": urlistModel.isMine() });
        },


        suggestUrl: function (target) {
            mixpanel.track("List:suggest_url");
        },

        acceptSuggestedUrl: function (target) {
            mixpanel.track("List:suggested_url_accept");
        },

        declineSuggestedUrl: function (target) {
            mixpanel.track("List:suggested_url_decline");
        },


        shareList: function (target, payload, deferred, extras) {
            var urlistModel = new ul.model.Urlist({ hash: target.list_hash });

            mixpanel.track("List:share", { "is_owner": urlistModel.isMine(), "channel": extras.channel, "source": extras.source });
        },

        shareUrl: function (target, payload, deferred, extras) {
            var urlistModel = new ul.model.Urlist({ hash: target.list_hash });

            mixpanel.track("Url:share", { "is_owner": urlistModel.isMine(), "channel": extras.channel, "source": extras.source });
        },

        followUser: function (target, x, x, x, originator) {
            mixpanel.track("User:follow", originator);
        },

        unfollowUser: function (target, x, x, x, originator) {
            mixpanel.track("User:unfollow", originator);
        },

        followList: function (target, x, x, x, originator) {
            var urlist = new ul.model.Urlist({ hash: target.list_hash });

            urlist.whenReady().done(function () {
                var properties = {
                    "links": urlist.get("urls").length,
                    "people": urlist.get("contributors").length
                };

                _.extend(properties, originator);

                mixpanel.track("List:follow", properties);
            });
        },

        unfollowList: function (target, x, x, x, originator) {
            var urlist = new ul.model.Urlist({ hash: target.list_hash });

            urlist.whenReady().done(function () {
                var properties = {
                    "links": urlist.get("urls").length,
                    "people": urlist.get("contributors").length
                };

                _.extend(properties, originator);

                mixpanel.track("List:unfollow", properties);
            });
        },

        viewProfile: function (profileModel, originator) {
            var properties = {
                is_owner: profileModel.isMine()
            };

            _.extend(properties, originator);

            mixpanel.track("Profile:view", properties);
        },

        updateProfile: function (target, payload) {
            mixpanel.track("User:update_profile");
        },

        updateCategories: function (target) {
            mixpanel.track("List:update_categories");
        },

        updateListCover: function (target) {
            mixpanel.track("List:update_cover");
        },

        acceptContribRequest: function (target) {
            mixpanel.track("List:contrib_accept");
        },

        declineContribRequest: function (target) {
            mixpanel.track("List:contrib_decline");
        },

        preboardingSlide: function (slideId) {
            mixpanel.track("Preboarding:slide", { slide: slideId });
        },

        preboardingSubmit: function (title) {
            mixpanel.track("Preboarding:submit");
        }

    });

    var myAction = new MyAction(broker);
    myAction.bindToBroker();

}) (UL.Broker);

