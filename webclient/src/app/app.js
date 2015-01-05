// Boot the Application

$(function () {
    // If the `APPLICATION` constant is not set,
    // then fallback on `Main`
    if (typeof APPLICATION === "undefined") {
        APPLICATION = "Main";
    }

    // We can with a URL param force it to book a specific app. Main, Bookmarklet, Onboarding
    APPLICATION = getLocationParameter("ul.config.application", APPLICATION);

    function boot(user, App) {

        // Set the global user to the loaded one
        C.set("user", user);

        // Trigger the `profile-loaded` message
        UL.Broker.trigger("profile-loaded", profile);

        // Prepare the application, bind it to the `body`
        var application = new App({
            el: "#urlist-content",
            user: user
        });

        // Render basic layout and header
        application.render();

        // Start the router and event handlers
        application.start();


        // Trigger the `app-ready` message
        UL.Broker.trigger("app-ready");

    }

    function shouldOnboard(profile) {
        return profile.get("pending_onboarding") === true;
    }

    function checkBeta(user) {
        var eligible  = user.get("__beta") === true,
            isAdmin   = user.get("__notrack"),
            cookieSet = $.cookie("ul.config.branch") == "beta",
            dialog;

        if (cookieSet && !isAdmin) {
            // If the user has the cookie set but it's not admin,
            // clean up the cookie and reload the app.
            $.removeCookie("ul.config.branch", "beta");
            window.location = "/";
        }

    }

    var profile = new model.Profile({ user_id: "~?t=" + Math.random() }),
        // APPLICATION can be Main, Bookmarklet
        App     = main[APPLICATION];

    // when the profile is loaded
    profile.whenReady()

        // Boot!
        .done(function () {
            Backbone.Pool["model.Profile:" + profile.get("username")] = profile;

            // Cleanup cookies for beta users
            checkBeta(profile);

            // We need to do the check for Beta iff the user is loading the
            // main application, not when she/he is using the bookmarklet

            if (shouldOnboard(profile))
                boot(profile, main["Onboarding"]);
            else
                boot(profile, App);
        })

        // Or fail miserably :'(
        .fail(function () {
            $("html").append(ul.util.t("layout/error"));
            console.error("Error loading current user");
        });

});

