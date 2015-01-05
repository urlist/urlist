main.Bookmarklet = ul.bbext.View.extend({
    name: "main.Bookmarklet",

    events: {
        // Login/signup
        "click .js-login"     : "loginCallback",
        "click .js-signup"    : "signupCallback",
        "click .js-recover-password": "recoverPasswordCallback",

        "keyup textarea[data-count='chars']" : "countChars"
    },

    loginCallback: function (e) {
        ul.dialog.login();
        return false;
    },

    signupCallback: function (e) {
        ul.dialog.signup();
        return false;
    },

    recoverPasswordCallback: function (e) {
        var recoverView = new view.dialog.RecoverPassword();
        recoverView.render();
        return false;
    },


    initialize: function () {
        this.user = this.options.user;

        this.model = new ul.bbext.Model({
            title   : getLocationParameter("title", "No title"),
            url     : getLocationParameter("url")
        });

        $("body").addClass("bookmarklet");

    },

    render: function () {
        var $html = $(ul.util.t("layout/bookmarklet")()),
            bookmarkletView = new view.Bookmarklet({
                el: $html.find("#content"),
                model: this.model
            });

        this.$el.html($html);

        bookmarkletView.render();

        ul.dialog.requireLogin({ onlySubmit: true });

        return this.$el;
    },

    start: function () { },

    navigate: function (e) {
        var href = $(e.target).closest("a").attr("href");
        this.router.navigate(href, { trigger: true });
        return false;
    },

    countChars: function (e) {

        var $me          = $(e.target),
            limitChars   = parseInt($me.attr("data-count-limit")),
            usedChars    = $me.val().length,
            totChars     = limitChars - usedChars,

            charsCounter = $("#" + $me.attr("rel"));

        charsCounter.html(totChars);

        (totChars < 0) ? charsCounter.addClass("alert-text") : charsCounter.removeClass("alert-text");
    }

});

