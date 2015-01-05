view.dialog.LoginModal = Backbone.Dialog.extend({
    dialogClass: "dialog-unlogged login-modal",

    subevents: {
        "keyup input[name='username']": "validateInput",
        "keyup input[name='password']": "validateInput"
    },

    subinitialize: function () {
        this.options.standalone = true;
    },

    subrender: function () {
        var template = ul.util.t("dialog/login_modal"),
            next = encodeURIComponent(window.location.href),
            json = {
                "facebook_url": API_ROOT + "login/facebook?next={0}".format(next),
                "twitter_url":  API_ROOT + "login/twitter?next={0}".format(next),
                "google_url":   API_ROOT + "login/google?next={0}".format(next)
            };

        return template(json);
    },

    validateInput: function (e) {
        view.utils.validateInput( $(e.target) );
    },

    success: function () {
        // After the user is logged in, re-show everything but 
        // with logged-in-ness. There was an investor who complained about this.
        window.location.reload();
    },

    error: function () {
        this.$(".js-login-error").removeClass("hide");
    },

    submit: function () {
        var payload = {
                email   : this.$("input[name='username']").val(),
                password: this.$("input[name='password']").val()
            },
            a = view.utils.validateInput(this.$("input[name='username']")),
            b = view.utils.validateInput(this.$("input[name='password']"));

        if (a && b) {
            UL.Broker.push("authenticate", {}, payload)
                .done(_.bind(this.success, this))
                .fail(_.bind(this.error, this));
        }

        return false;
    }

});

