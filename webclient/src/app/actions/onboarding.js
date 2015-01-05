( function (broker) {

    var OnboardingActions = actions.Action.extend({

        events: {
            "app-ready"     : "appReady"
        },

        appReady: function (target) {
            var user = C.get("user"),
                followList;

            // This is just for registered users!
            if (user.isAnonymous()) return;


            // OK, so the app is ready, we need to check if there are
            // some special values in the cookie set by the client
            // and do something with them.


            // `_ul_follow_list` is set only by the "aggressive signup dialog"
            // and contains the hash of the list to follow. This is an automatic
            // follow that has to be done just after the user signed up.
            followList = $.cookie("_ul_follow_list");

            // Clean up all the custom cookies!
            $.removeCookie("_ul_follow_list");

            // If we have a list to follow, do it!
            if (followList)
                UL.Broker.push("follow-list", { list_hash: followList });

        }
    });

    var onboardingActions = new OnboardingActions(broker);
    onboardingActions.bindToBroker();

}) (UL.Broker);

