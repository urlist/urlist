( function (broker) {

    var StartActions = actions.Action.extend({

        events: {
            "app-ready"     : "appReady"
        },

        appReady: function (target) {
            var user = C.get("user");

            // This is just for registered users!
            if (user.isAnonymous()) return;

            // If the user is doing the onboarding, do it later
            if (user.get("pending_onboarding")) return;

            var listHash    = $.cookie("_ul_suggest_list_hash"),
                url         = $.cookie("_ul_suggest_url"),
                description = $.cookie("_ul_suggest_description"),
                sectionId   = $.cookie("_ul_suggest_section_id"),
                doneMsg     = function () { view.utils.displayAlert("Thanks for making this list even more awesome!"); },
                failError   = function () { view.utils.displayAlert("Ouch, there was error, please suggest the link again.", "error"); };


            // cleanup
            $.removeCookie("_ul_suggest_list_hash");
            $.removeCookie("_ul_suggest_url");
            $.removeCookie("_ul_suggest_description");
            $.removeCookie("_ul_suggest_section_id");


            // We need the url and the listHash at least!
            if (!url || !listHash) {
                setTimeout(function () {
                    var goodbye = '<div class="message message-alert is--error">Urlist will be discontinued on Dec 31, <a href="https://medium.com/@vrde/epilogue-18698396094" target="_blank">learn more</a><div class="button-group"><a href="/goodbye" class="button small action">download your data</a><a href="#" class="button-close js-message-close">&times;</a></div> </div>';
                    ul.view.util.displayMessage(goodbye);
                }, 1000);
                return;
            }


            // OK, everything looks fine, checking URL
            UL.Broker.push("suggest-url",
                    { list_hash: listHash },
                    { url: url, description: description })
                .done(doneMsg)
                .fail(failError);

        }
    });

    var startActions = new StartActions(broker);
    startActions.bindToBroker();

}) (UL.Broker);

