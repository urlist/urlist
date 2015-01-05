view.dialog.SignupModal = Backbone.Dialog.extend({
    dialogClass: "dialog-unlogged signup-modal",

    subevents: {
        "keyup input[name='email']"    : "validateInput",
        "keyup input[name='password']" : "validateInput",
        "click .js-toggle"             : "toggleBlock",
        "click [data-track-source]"    : "trackSource"
    },

    subinitialize: function () {
        this.options.standalone = true;
    },

    subrender: function () {
        var template, url, next, json;

        // The aggressive variant of this dialog is meant to 'force' anon users to sign up. It shows up if they are in the player mode of a list.
        if (this.options.aggressive) {
            template = ul.util.t("dialog/signup_aggressive");
            $(".dialog-placing").addClass("is-aggressive");
            $(".signup-modal")[0].className = "dialog-wrapper dialog-unlogged signup-modal-plain";
        } else if (this.options.beta) {
            template = ul.util.t("dialog/signup_beta");
            $(".signup-modal")[0].className = "dialog-wrapper dialog-unlogged signup-modal-plain signup-beta";
        } else {
            template = ul.util.t("dialog/signup_modal");
        }

        if (this.options.nextUrl)
            url = this.options.nextUrl;
        else
            url = window.location.href;

        next = encodeURIComponent(url);

        json = {
            "facebook_url" : API_ROOT + "login/facebook?next={0}".format(next),
            "twitter_url"  : API_ROOT + "login/twitter?next={0}".format(next),
            "google_url"   : API_ROOT + "login/google?next={0}".format(next),
            "app_id"       : CONFIG.fb.app_id
        };

        json.onboarding = this.options.onboarding;

        return template(json);
    },

    loginDialog: function () {
        var dialog = new view.dialog.LoginModal({});
        dialog.render();
    },

    validateInput: function (e) {
        view.utils.validateInput( $(e.target) );
    },

    trackSource: function () {
        var expires = new Date();

        expires.setMinutes(expires.getMinutes() + 5);

        if (this.options.source) {
            $.cookie("_ul_signup_source", this.options.source, { expires: expires });
            $.cookie("_ul_follow_list", this.options.listHash, { expires: expires });
        }
    },

    toggleBlock: function () {
        this.$(".js-toggle-one").addClass("hide");
        this.$(".js-toggle-two").removeClass("hide");
        // Give focus to [email] textfield
        this.$(".js-toggle-two input:first").focus();
        // Works w/out this.
        $(".signup-modal").animate({top:"-100px"});
        return false;
    },

    loginSuccess: function () {
        window.location.reload();
    },

    error: function (response) {
        console.debug("response:",response);
        if (response === "InvalidPassword") {
            // view.utils.displayAlert("Sorry, the password can only have a-z, A-Z and 0-9. \nOr log in with Facebook, and you won't have to worry about passwords");
            this.$(".error-message[data-error='invalid-password']").removeClass("hide");
        } else if (response === "Mail address already associated with an Urlist account."){
            this.$(".error-message[data-error='already-exists']").removeClass("hide");
        } else {
            view.utils.displayAlert("Sorry, something went wrong here. Try again, please", "error");
        }
    },

    submit: function () {
        var payload = {
                email   : this.$("input[name='email']").val(),
                password: this.$("input[name='password']").val()
            },
            emailIsValid = view.utils.validateInput(this.$("input[name='email']")),
            passwIsValid = view.utils.validateInput(this.$("input[name='password']"));

        this.$(".error-message").addClass("hide");

        if (payload.password.length < 5) {
            this.$(".error-message[data-error='too-short']").removeClass("hide");
            return false;
        }

        if (emailIsValid && passwIsValid) {
            var that = this;
            UL.Broker.push("new-profile", {}, payload)
                .done(function () {
                    UL.Broker.push("authenticate", {}, payload)
                        .done(that.loginSuccess)
                        .fail(function () {
                            view.utils.displayAlert("Sorry, something went wrong here. Try again, please", "error");
                        });
                })
                .fail(_.bind(this.error, this));
        }

        return false;
    },

    cancel: function () {
        $.removeCookie("_ul_signup_source");
        $.removeCookie("_ul_follow_list");
    }

});
