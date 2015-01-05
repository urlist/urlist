( function (broker) {
    // Set up some variables to be used when an anon user is browsing a list.

    // Right now we are testing some specific list, if the test is working,
    // we may generalize it to a broader set of lists.
    var listsToTest = "".split(","),

    // Set up a counter to count the number of times the anon user browsed
    // the links in the test lists. It will be something like
    // `anonCounter["Pd9"] --> 2`, this means that the anon user visited 2 URLs
    // for the list Pd9.
        anonCounter = {},

    // Set up the number of URLs to view on a list before popping out the
    // new aggressive dialog.
        anonLimit   = 2;


    var Notifications = actions.Action.extend({

        events: {
            "view-list"      : "viewList",
            "view-url"       : "viewUrl",

            "view-discovery" : "viewDiscovery"
        },


        // Add some logic for the anon user browsing a list
        viewUrl: function (urlistModel) {

            // Get the hash for the current list
            var hash = urlistModel.get("hash");


            // If the user is registered skip or if
            // the list the user is browsing is not in the test, skip the func.
            if (!C.get("user").isAnonymous() ||
                listsToTest.indexOf(hash) == -1) return;


            // OK, we have an anon user visiting a test list, but the counter
            // is still not initialized. Set the counter for the list `hash`
            // to zero.
            if (!anonCounter[hash])
                anonCounter[hash] = 0;

            // Hey, this is not so hard.
            anonCounter[hash]++;

            // If we are hitting the limit, show the aggressive signup dialog.
            // We are feeding the new dialog with two specific params, namely
            // `source`, used to track the source of the signup, if any, and
            // `listHash`, so if the user signup we can automatically make
            // him/her follow the list he/she was viewing.
            if (anonCounter[hash] == anonLimit) {
                ul.dialog.signup({
                    aggressive    : true,
                    closeOnOverlay: false,
                    closeOnKey    : false,
                    source        : "blocking_dialog",
                    listHash      : hash
                });

                // And we need also to track on Mixpanel the display of the
                // dialog, so then we'll be able to have a nice statistic
                // if this is working or not.
                mixpanel.track("TEST:blocking_dialog", { hash: hash });
            }
        },

        viewList: function (target) {
            var listModel = new ul.model.Urlist({ hash: target.get("hash")});

            listModel.whenReady().done(function () {
                var dialog;

                if (listModel.toJoin()) {
                    new view.message.AskToJoin({ model: listModel }).render();
                } else if (listModel.toCategorize()) {
                    if (listModel.get("__is_new")) {
                        listModel.unset("__is_new");
                        dialog = new view.dialog.SelectCategory({ skipAnimation: true, model: listModel });
                        dialog.render();
                    } else {
                        ul.view.util.displayMessage(ul.util.t("messages/add_category")(listModel.toJSON()));
                    }
                }
            });
        }

    });

    var notifications = new Notifications(broker);
    notifications.bindToBroker();

}) (UL.Broker);

