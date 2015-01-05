view.dialog.ShareList = Backbone.Dialog.extend({

    dialogClass: "dialog-share_list",

    subevents: {
        "click .js-trigger-share--email"      : "renderShareEmail",
        "click .js-trigger-share--gplus"      : "shareListToGoogle",
        "click .js-trigger-share--twitter"    : "shareListToTwitter",
        "click .js-trigger-share--facebook"   : "shareListToFacebook",
        "click .js-toggle-advanced-embedding" : "toggleAdvancedEmbedding"
    },

    subrender: function () {
        var json = this.model.toJSON({calculated: true});
        var template = ul.util.t("dialog/share_list");
        var author_screenname = this.model.get("userauthor").get("screen_name");
        var author_username = this.model.get("userauthor").get("username");
        var embedRoot = "//" + window.location.host;

        var $html = $(template(_.extend(json, { 
            author_screenname: author_screenname, 
            author_username: author_username, 
            embedroot: embedRoot,
            embed: this.options.embed
        })));

        return $html;
    },

    success: function () {
        var template = ul.util.t("dialog/share_list_email.success");

        this.$(".js-dialog--hook").empty();
        this.$(".js-dialog--hook").append(template());
    },

    renderShareEmail: function () {
        if (ul.dialog.requireSignup()) return false;

        var json = this.model.toJSON(),
            template = ul.util.t("dialog/share_list_email");

        this.$(".js-dialog--hook").empty();
        this.$(".js-dialog--hook").append(template(json));

        return false;
    },

    shareListToTwitter: function () {
        twitterShare(this.model.toTweet());
        UL.Broker.trigger("share-list", { list_hash: this.model.get("hash") }, null, null, { channel: "twitter" } );
        return false;
    },

    shareListToFacebook: function () {
        facebookShare(this.model.fullUrl());
        UL.Broker.trigger("share-list", { list_hash: this.model.get("hash") }, null, null, { channel: "facebook" } );
        return false;
    },

    shareListToGoogle: function () {
        googleShare(this.model.fullUrl());
        UL.Broker.trigger("share-list", { list_hash: this.model.get("hash") }, null, null, { channel: "google" } );
        return false;
    },

    toggleAdvancedEmbedding: function (e) {
        var parentToggle = $(e.target).parents(".js-toggle");

        // Show "advanced" textarea
        parentToggle.toggleClass("js-switch");
        // Highlight the newly shown textarea
        parentToggle.find("textarea:visible").trigger("click").select();
    },

    afterRender: function () {
        // Give focus to an input where [autofocus] is not supported
        this.$("input[autofocus]").focus();
        this.$("textarea[autofocus]").select();
    },

    submit: function () {
        var that = this,
            payload = {
                emails : this.$("input[name='emails']").val(),
                message: this.$("textarea[name='message']").val()
            },
            isValid = _.chain(payload.emails.split(",")).map($.trim).all(isEmail).value();

        this.$(".js-recipients-error").not(isValid).toggleClass("hide");

        if (!isValid)
            return false;

        UL.Broker.push("share-list", { list_hash: this.model.get("hash") }, payload, { channel: "email" })
            .done(_.bind(this.success, this))
            .fail(function () {
                view.utils.displayAlert("There was an error sending the email :(", "error");
            });
    }

});
