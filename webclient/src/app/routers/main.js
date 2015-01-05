router.Main = Backbone.Router.extend({

    routes: {

        ""                        :"root",

        // Activity Page (former Notifications/Requests Page)
        "activity"                : "activity",

        // Discover
        "discover/top"            : "discoveryTop",
        "discover/network"        : "discoveryNetwork",
        "discover/network/links"  : "discoveryNetworkLinks",
        "discover/follow"         : "discoveryFollow",
        "discover"                : "discovery",

        // Compability yo
        "user/:args"              : "compUser",
        "dashboard"               : "dashboard",

        // Library Page
        "library"                 : "dashboard",
        "library/"                : "dashboard",
        "library/:user/created"   : "dashboardAuthored",
        "library/:user/joined"    : "dashboardJoined",
        "library/:user/bookmarks" : "dashboardBookmarks",
        "library/:user"           : "dashboardAll",


        // Search Urls
        "search/me/:query/links"            : "searchMyLibraryLinks",
        "search/me/:query"                  : "searchMyLibrary",

        "search/network/:query/links"       : "searchNetworkLinks",
        "search/network/:query"             : "searchNetwork",

        "search/:query/links"               : "searchGlobalLinks",
        "search/:query"                     : "searchGlobal",


        // Account settings
        "settings"                          :"settings",
        "settings/:dialog"                  :"settings",

        // 404 Not Found
        "error/404"                         :"error404",


        // Landing page
        "landing"                           :"landingPage",

        // Website Pages
        "resources/:page"                   :"resource",


        // Category Page
        "category/:name"                    : "category",
        "category/:name/popular"            : "category",
        "category/:name/new"                : "categoryNew",
        "category/:name/network"            : "categoryNetwork",

        // Hashtag Page
        "hashtag/:hashtag"                  : "hashtag",
        "hashtag/:hashtag/popular"          : "hashtag",
        "hashtag/:hashtag/new"              : "hashtagNew",
        "hashtag/:hashtag/network"          : "hashtagNetwork",


        // logout action
        "logout"                            :"logout",

        // list or navigation
        ":list_hash/:url_hash"              :"listNavigation",
        ":list_hash/"                       :"listNavigation",
        ":hash"                             :"list"
    },

    initialize: function () {
        // The 'current' object is a place where you simply hang things on, it's a safe name to attach your methods to.
        // If you are changing the view, you can simply set "this.current.view" =, followed by the object representing your view.
        this.current = {};
    },

    root: function () {
        if (C.get("user").isAnonymous()) {
            this.landingPage();
        } else {
            this.discoveryNetwork();
        }
    },

    getNavigation: function (urlistModel) {
        if (this.current.name != "navigation." + urlistModel.get("hash")) {
            this.cleanUp();
            this.current.view = new view.navigation.Navigation({ el: $("#content"), model: urlistModel });
            this.current.name = "navigation." + urlistModel.get("hash");

            this.current.view.render();
        }

        V = this.current.view;

        this.finalize();
        return this.current.view;
    },

    manageDialog: function () {
        // manageDialog
        // ------------
        // This method checks the url params. If it contains something along the lines of ?d=
        // it means a dialog is in place.
        var name = getLocationParameter("d"),
            that = this;

        if (name == "recover") {
            var recoverCode = getLocationParameter("recover_code"),

                dialog = new view.dialog.ResetPassword({
                    dialogClass: "dialog-reset-password",
                    recoverCode: recoverCode,
                    onlySubmit: true
                });

            dialog.render();

        } else if (name == "onboarding") {
            new view.dialog.NewList({
                    model: C.get("user"),
                    closeOnOverlay: false,
                    gotoList: true,
                    onboarding: true
                }).render();
        } else if (name == "categorize") {
            this.current.view.model.whenReady().done(function () {
                new view.dialog.SelectCategory({
                        model: that.current.view.model
                    }).render();
            });
        }
    },

    cleanUp: function () {
        ul.view.util.clearMessages();

        // force tooltip cleanup
        $(".tooltip").remove();
        // Dismiss Search dropdown within the Library
        $(".search_cta-list").removeClass("show");
        // Dismiss every dropdown menus
        $(".dropdown").removeClass("is--active");

        // Clear all the active states in Header
        $(".js-app-navigation li").removeClass("active");

        // We want a clean state. If there is a view, clean it up!
        if (this.current.view) {
            this.current.view.unbindMe();
            $("#header").after("<div id='content' />");
        }

        $("#header").show();

        $("body").removeClass("landing-page");
        $(".sticker-scrollTop").removeClass("hide");
        $("#footer").addClass("hide");

        UL.DialogStack.cleanAll();
    },

    finalize: function () {
        this.manageDialog();
    },

    scrollToTop: function () {
        $('html, body').animate({ scrollTop: 0 }, 200);
    },

    landingPage: function () {
        this.cleanUp();

        var landingPageView = new view.LandingPage({
            el: $("#content")
        });

        landingPageView.render();
        $("#header").hide();

        setDocumentTitle("Curate your World");

        this.current.view = landingPageView;

        UL.Broker.trigger("view-landing");

        this.finalize();
    },

    /**
     * Discovery stuff. Router is getting fatter and fatter,
     * we should split into different modules one day...
     */
    getDiscovery: function () {
        this.cleanUp();

        this.current.view = new view.discovery.Discovery({
            el: $("#content")
        });
        this.current.name = "discovery";
        this.current.view.render();

        setDocumentTitle("Discovery");

        return this.current.view;
    },

    discovery: function () {
        var discoveryView = this.getDiscovery();

        discoveryView.renderMain();

        setDocumentTitle("Popular");

        this.scrollToTop();

        this.finalize();
    },

    discoveryNetwork: function (name) {
        if (!C.get("user").isAnonymous()) {
            var discoveryView = this.getDiscovery();
            discoveryView.renderNetwork();

            setDocumentTitle("Your Network");

            UL.Broker.trigger("view-discovery");
            this.finalize();
        } else {
            this.root();
        }
    },

    discoveryNetworkLinks: function (name) {
        var discoveryView = this.getDiscovery();
        discoveryView.renderNetworkLinks();

        setDocumentTitle("Your Network");

        UL.Broker.trigger("view-discovery");

        this.finalize();
    },

    discoveryFollow: function (name) {
        var discoveryView = this.getDiscovery();
        discoveryView.renderFollow();

        setDocumentTitle("Follow More");

        UL.Broker.trigger("view-discovery");

        this.finalize();
    },

    // Category routes
    // ---------------
    // By default, `category` returns the popular lists in the specified category
    category: function (name, sort, network) {
        network = network === true;
        sort    = sort || "popularity";
        this.cleanUp();

        var inUse = _.findWhere(UL.CATEGORIES, { slug: name }) != undefined;

        if (inUse) {
            var categoryModel = new model.Category({
                    name   : name,
                    network: network,
                    sort   : sort
                }),
                categoryView  = new view.Category({
                    model: categoryModel,
                    el: $("#content")
                }),
                categoryLabel = _.findWhere(UL.CATEGORIES, { slug: name }).label;

            categoryView.render();

            $(".js-toolbar li").removeClass("acive");
            $(".js-toolbar .js-" + sort).parent().addClass("active");

            setDocumentTitle("Explore {0}".format(categoryLabel));
            this.current.name = "category-" + name;
            this.current.view = categoryView;
            UL.Broker.trigger("view-category", name);
            this.finalize();
        } else {
            this.error404();
        }
    },

    // Return new lists matching the category
    categoryNew: function (name) {
        return this.category(name, "-creation_time");
    },

    // Return popular lists in user's network matching the category
    categoryNetwork: function (name) {
        return this.category(name, "network", true);
    },


    // Hashtag routes
    // ---------------
    //
    // By default, `hashtag` returns the popular lists in the specified category
    hashtag: function (hashtag, sort, network) {
        network = network === true;
        sort    = sort || "popularity";

        this.cleanUp();

        var hashtagModel = new model.Hashtag({
                hashtag: hashtag,
                network: network,
                sort   : sort
            });

        var hashtagView  = new view.Hashtag({
                model: hashtagModel,
                el: $("#content")
            });

        hashtagView.render();
        $(".js-toolbar li").removeClass("acive");
        $(".js-toolbar .js-" + sort).parent().addClass("active");
        setDocumentTitle("Discover {0}".format(hashtag));
        this.current.view = hashtagView;
        UL.Broker.trigger("view-hashtag", hashtag);
        this.finalize();
    },

    // Return new lists matching the hashtag
    hashtagNew: function (hashtag) {
        return this.hashtag(hashtag, "-creation_time");
    },

    // Return popular lists in user's network matching the hashtag
    hashtagNetwork: function (hashtag) {
        return this.hashtag(hashtag, "network", true);
    },


    // Library routes
    // --------------

    getDashboard: function (profileModel) {
        profileModel = profileModel || ul.util.getCurrentProfile();
        
        // If this is the first time in this boot we run the app, do this. 
        // If not the first time, this.current.name will be set correctly
        if (this.current.name != "profile." + profileModel.get("username")) {
            this.cleanUp();
            this.current.view = new view.dashboard.Dashboard({ el: $("#content"), model: profileModel });
            this.current.name = "profile." + profileModel.get("username");

            this.current.view.render();
        }

        setDocumentTitle(profileModel.get("screen_name") + "'s Profile");
        UL.Broker.trigger("view-profile", profileModel);

        this.finalize();
        return this.current.view;
    },

    compUser: function (args) {
        return UL.Router.navigate(
                    "/library/{0}".format(args), {trigger: true}
                );
    },

    dashboard: function (username, what, params) {
        var profileModel, that;

        // If `user` is not provided, redirect to the current username
        if (!username) {
            return UL.Router.navigate(
                        "/library/{0}".format(C.get("user").get("username")),
                        { trigger: true });
        }

        what = what || "all";
        profileModel = new model.Profile({ username: username });
        that = this;

        // When the model is ready, make a view with it as base
        profileModel.whenReady()
            .done(function () {
                var funcName = "render" + what.toTitleCase();
                that.getDashboard(profileModel)[funcName](params);
            })
            .fail(function () { UL.Router.error404(); });

        this.finalize();
    },

    dashboardAll: function (username) {
        this.dashboard(username, "all");
    },

    dashboardAuthored: function (username) {
        this.dashboard(username, "authored");
    },

    dashboardJoined: function (username) {
        this.dashboard(username, "joined");
    },

    dashboardBookmarks: function (username) {
        this.dashboard(username, "bookmarks");
    },

    activity: function () {
        if (ul.dialog.requireSignup()) return false;

        this.getDiscovery().renderActivity();
    },

    // Search methods
    // --------------

    search: function (query, scope, display) {
        this.cleanUp();

        var searchModel = new model.Search({
                query: query,
                scope: scope
            });

        var searchView = new view.search.Search({
                el     : $("#content"),
                model  : searchModel,
                display: display
            });

        this.current.view = searchView;
        this.current.name = ["search", query, scope, display].join("-");

        searchView.render();

        this.scrollToTop();
        this.finalize();

        // XXX: FIX TRACKING
        UL.Broker.trigger("search", query);
    },

    searchMyLibraryLinks: function (query) {
        return this.search(query, "me", "links");
    },

    searchMyLibrary: function (query) {
        return this.search(query, "me", "lists");
    },

    searchNetworkLinks: function (query) {
        return this.search(query, "network", "links");
    },

    searchNetwork: function (query) {
        return this.search(query, "network", "lists");
    },

    searchGlobalLinks: function (query) {
        return this.search(query, "global", "links");
    },

    searchGlobal: function (query) {
        // If search is #hashtag, redirect to hashtag. Otherwise do regular search
        var hashtagRegex = /^#\w+$/; // String that starts with #, then any number of non-whitespace chars, and ends after that. Simply, a hashtag regex. 
        if (hashtagRegex.test(query)) {
            var hashtag = query.substring(1, query.length) // Remove the #
            UL.Router.navigate("/hashtag/{0}".format(hashtag), {trigger: true});
            return false;
        } else {
            return this.search(query, "global", "lists");
        }
    },


    logout: function () {
        $.get(API_ROOT + "logout")
            .done(function () { window.location = "/"; });
    },

    resource: function (page) {
        this.cleanUp();

        var pageView = new view.Resource({
            el: $("#content"),
            page: "/_resources/" + page
        });

        this.current.view = pageView;
        this.current.name = "resource";

        switch (page) {
            case "about":
                setDocumentTitle("About");
            break;

            case "jobs":
                setDocumentTitle("Jobs");
            break;

            case "button":
                setDocumentTitle("Urlist Button");
            break;

            case "privacy":
                setDocumentTitle("Privacy Policies");
            break;

            case "terms":
                setDocumentTitle("Terms of service");
        }

        $("body").attr("data-view", "page:" + page);

        pageView.render();

        this.finalize();
    },

    error404: function () {
        this.cleanUp();
        this.current.view = new ul.bbext.View({
            template: ul.util.t("error/404"),
            el: $("#content")
        });

        $("#main").removeClass("content-app");

        this.current.view.render();

        this.finalize();
    },

    settings: function (dialog) {
        if (ul.dialog.requireSignup()) return false;

        this.cleanUp();

        var settingsModel = C.get("user");
        var settingsView = new view.Settings({ el: $("#content"), model: settingsModel });

        this.current.view = settingsView;
        this.current.name = "settings";

        settingsView.render();

        setDocumentTitle("Your Settings");

        this.scrollToTop();
        this.finalize();
    },

    listNavigation: function (list_hash, url_hash) {
        var list_hash   = list_hash.split("-")[0],
            url_hash    = url_hash && url_hash.split("-")[0],
            that        = this,
            urlistModel = new ul.model.Urlist({ hash: list_hash });

        urlistModel.whenReady().done(function () {
            var urlModel;
            if (!url_hash)
                url_hash = urlistModel.get("urls").at(0).get("hash");

            urlModel = urlistModel.getUrlByHash(url_hash);

            that.getNavigation(urlistModel).goHash(url_hash);
            UL.Broker.trigger("view-url", urlistModel, urlModel);
        });

    },

    list: function (hash, refresh) {
        this.cleanUp();
        this.scrollToTop();

        var urlistModel = typeof hash === "string" ? new ul.model.Urlist({ hash: hash.split("-")[0] }) : hash,
            urlistView = new view.urlist.List({ el: $("#content"), model: urlistModel });

        this.current.view = urlistView;
        this.current.name = "urlist";
        window.currentView = urlistView; //Refactor me!

        var that = this;

        urlistModel.fetch().done(function () {
            urlistView.render();

            if (!refresh) {
                UL.Broker.trigger("view-list", urlistModel);
            }

            that.finalize();
        }).fail(function () {
            that.error404();
        });
    }

});

