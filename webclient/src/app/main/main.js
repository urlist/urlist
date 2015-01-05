main.Main = ul.bbext.View.extend({
    name: "main.Main",

    events: {
        // Login/signup
        "click .js-login"             : "loginCallback",
        "click .js-signup"            : "signupCallback",
        "click .js-signup-sticky"     : "signupStickyCallback",
        "click .js-learn-more"        : "signupCallback",
        "click .js-recover-password"  : "recoverPasswordCallback",
        "click .js-noop"              : "noop",

        // Multiple master
        "click .js-switch-multiple-master"  : "switchMultipleMaster",

        // Feedback
        "click .js-leave-feedback"    : "feedbackCallback",

        // Main Callbacks
        "click .js-navigate"          : "navigate",
        "click .js-new-list"          : "newListCallback",

        "click .js-open-dialog[data-dialog='select-category']" : "categoryDialogCallback",

        // Callbacks for events
        "click"                       : "mainDispatcherClear",
        "click .js-toggle-menu"       : "mainDispatcherGet",

        "click .js-scrolltop"         : "scrollToTop"
    },

    initialize: function () {
        this.user = this.options.user;
        this.setupNotifications();
    },

    render: function () {
        var $html = $(ul.util.t("layout/main")());

        this.$el.html($html);
        var header = new view.Header({ el: $("#header"), model: this.user });
        header.render();

        $(document).tooltip();

        return this.$el;
    },

    start: function () {
        this.router = new router.Main();
        UL.Router = this.router;

        Backbone.history.start({ pushState: true });
    },

    navigate: function (e) {
        // This function makes links with class "js-navigate" circumvent the standard browser link
        // functionality. Before the browser can do it's thing, we navigate with the router. 
        var $anchor = $(e.target).closest("a"),
            href    = $anchor.attr("href"),
            source  = e.getSource();

        UL.EventOriginator.push(source);
        this.router.navigate(href, { trigger: true });

        UL.Broker.trigger("page-view");

        return false;
    },

    loginCallback: function (e) {
        ul.dialog.login();
        return false;
    },

    signupCallback: function (e) {
        ul.dialog.signup();
        return false;
    },

    signupStickyCallback: function (e) {
        ul.dialog.signup({ onboarding: true, closeOnOverlay: false, closeOnKey: false });
        return false;
    },

    recoverPasswordCallback: function (e) {
        var recoverView = new view.dialog.RecoverPassword();
        recoverView.render();
        return false;
    },

    switchMultipleMaster: function (e) {
        var newMaster = $(e.target).attr("data-mode");
        console.log("Switching to", newMaster);

        $.cookie("ul.config.branch", newMaster);

        window.location.href = "/";
    },

    feedbackCallback: function (e) {
        var feedbackView = new view.dialog.Feedback();

        feedbackView.render();
    },

    newListCallback: function (e) {
        if (ul.dialog.requireSignup()) return false;

        e.preventDefault();

        var dialog = new view.dialog.NewList({
                model: C.get("user"),
                closeOnOverlay: false,
                gotoList: true,
                sourceEvent: e
            });

        dialog.render();
    },

    noop: function () {
        return false;
    },

    categoryDialogCallback: function (e) {
        e.preventDefault();
        var listModel = new ul.model.Urlist({ hash: $(e.target).attr("data-hash") });
        listModel.whenReady().done( function () {
            var dialog = new view.dialog.SelectCategory({
                        model: listModel
                    });

            dialog.render();
        });
    },

    mainDispatcherClear: function (e) {
        var target = $(e.target);

        if ( $(e.target).hasClass("dropdown") || $(e.target).hasClass("dropup") || $(e.target).parents(".dropdown, .dropup").length ) {
            // do nothing, basically
        } else {
            $(".dropdown.is--active").removeClass("is--active");
            $(".dropup.is--active").removeClass("is--active");
        }

        // Dismiss correctly .search_cta-list (aka Search in the Header)
        if ( !( target.hasClass("js-search-delete") ||
                target.hasClass("search_cta-list") ||
                target.parents(".search_cta-list").length ||
                target.hasClass("saved-searches") ||
                target.parents(".saved-searches").length ||
                this.$(".js-search-input").is(":focus") ) ) {

            this.$(".search_cta-list").removeClass("show");
            this.$(".js-search-input").removeClass("focused");

        }
    },

    mainDispatcherGet: function (e) {
        var $thisMenu = $(e.target).closest("a").siblings(".dropdown, .dropup").toggleClass("is--active");

        $(".dropdown, .dropup").not($thisMenu).removeClass("is--active");

        e.preventDefault();
        e.stopPropagation();
    },

    toggleBox: function (e) {
        $(e.target).closest(".js-toggle").toggleClass("js-switch");

        return false;
    },

    scrollToTop: function (e) {
        e.preventDefault();

        $("html, body").animate({ scrollTop: 0 }, "250");
    },

    setupNotifications: function () {
        C.set("notifications", new model.Notifications());

        if (!this.user.get("is_anonymous")) {
            C.get("notifications").fetch();
            setInterval('C.get("notifications").fetch()', 30000);
        }

    }

});

