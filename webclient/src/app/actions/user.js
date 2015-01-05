( function (broker) {

    var UserActions = actions.Action.extend({

        events: {
            "add-list"      : "addList",
            "remove-list"   : "removeList",

            "follow-user"   : "followUser",
            "unfollow-user" : "unfollowUser",

            "follow-list"   : "followList",
            "unfollow-list" : "unfollowList",

            "update-profile" : "updateProfile",

            "accept-contrib-request" : "acceptContribRequest",
            "decline-contrib-request": "declineContribRequest"
        },

        addList: function (target, payload, deferred, extras) {
            deferred.done( function (payload) {
                var listModel,
                    user = C.get("user");

                if ( payload.is_secret )
                    user.inc("secret_lists_left", -1);

                listModel = new ul.model.Urlist( payload, { parse: true } );

                // XXX should be removed, is better to use a timeframe to understand
                // how much new a list is!
                listModel.set("__is_new", true);

                user.get("lists").add(listModel, { at: 0 });

                if (extras.gotoList)
                    UL.Router.navigate( "/{0}".format(listModel.get("hash")), { trigger: true } );
            });
        },

        removeList: function (target, payload) {
            var listModel = new ul.model.Urlist({ hash: target.list_hash });

            // XXX: not so cool
            delete Backbone.Pool["models.Urlist:{0}".format(listModel.get("hash"))];

            C.get("user").get("lists").remove(listModel);
            listModel.destroy();
        },

        followUser: function (target, payload, deferred, extras) {
            var user        = new model.User({ user_id: target.user_id }),
                myself      = new model.User({ user_id: C.get("user").get("user_id")}),
                profile     = extras ? new model.Profile({ username: extras.username }) : null,
                following   = C.get("user").get("following_users");

            if (profile)
                profile.whenReady().done( function () {
                    profile.set("following", true);
                    profile.get("followed_by_users").add(myself);
                });

            following.add(user);
        },

        unfollowUser: function (target, payload, deferred, extras) {
            var user        = new model.User({ user_id: target.user_id }),
                myself      = new model.User({ user_id: C.get("user").get("user_id")}),
                profile     = new model.Profile({ username: extras.username }),
                following   = C.get("user").get("following_users");

            profile.set("following", true);
            profile.get("followed_by_users").remove(myself);

            following.remove(user);
        },

        followList: function (target) {
            var urlist = new ul.model.Urlist({ hash: target.list_hash }),
                myself = new model.User({ user_id: C.get("user").get("user_id")}),
                followed = C.get("user").get("followed_lists");

            urlist.whenReady().done(function () {
                urlist.set("following", true);
                urlist.inc("followers_amount");
                urlist.get("followers").add(myself);

                followed.add(urlist);
            });
        },

        unfollowList: function (target) {
            var urlist = new ul.model.Urlist({ hash: target.list_hash }),
                myself = new model.User({ user_id: C.get("user").get("user_id")}),
                followed = C.get("user").get("followed_lists");

            urlist.set("following", false);
            urlist.inc("followers_amount", -1);
            urlist.get("followers").remove(myself);

            followed.remove(urlist);
        },

        updateProfile: function (target, payload) {
            C.get("user").set(payload);

            // XXX: should be fixed by future lookup function
            var me = new model.Profile({ username: C.get("user").get("username") });
            me.set(payload);
        },

        acceptContribRequest: function (target) {
            var notifications = C.get("notifications").get("notifications"),
                user          = C.get("user"),
                request       = _.find(notifications, function (n) { return n.data && n.data.notification_id == target.notification_id; }),
                urlistModel   = request && new ul.model.Urlist({ hash: request.data.list_hash });

            if (urlistModel)
                urlistModel.whenReady()
                    .done(function () {
                        contrib = urlistModel.get("contributors").get((user.get("user_id")));
                        user.get("lists").unshift(urlistModel);
                        contrib.set("status", "accepted");
                    });

            request.status = "accepted";
        },

        declineContribRequest: function (target) {
            var notifications = C.get("notifications").get("notifications"),
                user          = C.get("user"),
                request       = _.find(notifications, function (n) { return n.data && n.data.notification_id == target.notification_id; }),
                urlistModel   = request && new ul.model.Urlist({ hash: request.data.list_hash });

            if (urlistModel)
                urlistModel.whenReady()
                    .done(function () {
                        urlistModel.get("contributors").remove(user.get("user_id"));
                    });

            request.status = "declined";
        }

    });

    var userAction = new UserActions(broker);
    userAction.bindToBroker();

}) (UL.Broker);

