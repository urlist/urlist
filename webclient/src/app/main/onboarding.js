main.Onboarding = ul.bbext.View.extend({
    name: "main.Onboarding",

    events: {
        "click .js-login"     : "loginCallback",
        "click .js-signup"    : "signupCallback",
    },

    loginCallback: function (e) {
        ul.dialog.login();
        return false;
    },

    signupCallback: function (e) {
        ul.dialog.signup();
        return false;
    },

    render: function () {
        var $html = $(ul.util.t("layout/onboarding")()),

            onboardingView = new view.Onboarding({
                    el: $html.find("#content"),
                    model: this.options.user
                });

        this.$el.html($html);
        onboardingView.render();
        //ul.dialog.requireLogin({ onlySubmit: true });
        return this.$el;
    },

    start: function () { }

});

