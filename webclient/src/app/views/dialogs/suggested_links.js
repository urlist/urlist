view.dialog.SuggestedLinks = Backbone.Dialog.extend({

    dialogClass: "suggested-links",

    template   : ul.util.t("dialog/suggested_links"),

    subevents: {
        "click .js-trigger-accepted": "acceptLink",
        "click .js-trigger-noaccept": "declineLink"
    },

    subinitialize: function () {},

    fillUser: function ($el, user) {
        user.whenReady().done(function () {
            $el.attr("href", "/library/" + user.get("username"));
            $el.text(user.get("screen_name"));
        });
    },

    subrender: function () {
        var json  = this.model.toJSON(),
            $html = $(this.template(json)),
            users = $html.find("[data-user_id]"),
            i, $user;

        for (i = 0; i < users.length; i++) {
            $user = $(users[i]);
            this.fillUser($user, new model.User({user_id: $user.data("user_id")}));
        }

        return $html;
    },

    acceptLink: function (e) {
        var suggestionId = $(e.target).closest("[data-suggestion_id]").data("suggestion_id");

        UL.Broker.push("suggested-url-accept",
                { list_hash: this.model.get("hash") },
                { suggestion_id: suggestionId })

            .done( function () {
                $(e.target).parents(".js-actions_link").find(".js-accepted").siblings().addClass("hide");
                $(e.target).parents(".js-actions_link").find(".js-accepted").removeClass("hide");
            })

            .fail( function (error) {
                if (error == "UrlExists") {
                    view.utils.displayAlert("The suggested link is already listed.");
                    $(e.target).parents(".js-actions_link").find(".js-accepted").siblings().addClass("hide");
                    $(e.target).parents(".js-actions_link").find(".js-accepted").removeClass("hide");
                } else {
                    view.utils.displayAlert("Ouch, there was error, please reload the page.", "error");
                }
            });

        return false;
    },

    declineLink: function (e) {
        var suggestionId = $(e.target).closest("[data-suggestion_id]").data("suggestion_id");

        UL.Broker.push("suggested-url-decline",
                { list_hash: this.model.get("hash") },
                { suggestion_id: suggestionId })
            .done( function () {
                $(e.target).parents(".js-actions_link").find(".js-noaccept").siblings().addClass("hide");
                $(e.target).parents(".js-actions_link").find(".js-noaccept").removeClass("hide");
            })

            .fail( function () {
                view.utils.displayAlert("Ouch, there was error, please give it another try.", "error");
            });

        return false;
    },

    _unbindMe: function () {
        this.model.fetch();
    }

});

