( function () {

    UrlistModel = ul.bbext.Model.extend({
        name: "model.Urlist",

        mbFetch: true,
        mbAction: "fetch-list",
        mbKey: "list_hash",

        urlRoot: API_ROOT + "list",

        idAttribute: "hash",

        // There are some properties of the urlist model we want to use, but
        // that are not present on the server.
        // In the initialization, with the this.calculated method, we
        // generate these properties. These are also called whenever
        // something.toJSON is called. 
        //
        // In essence, these things appear to the client as properties, but
        // Andrea will never have to be bothered by them.
        initialize: function() {
            this.calculated(this.isMine, "is_mine", this);
            this.calculated(this.getFollowersAmount, "followers_amount", this);
            this.calculated(this.getLabelCategories, "label_categories", this);
            this.calculated(this.getCategories, "categories_by_name", this);
            this.calculated(this.getContributorsAmount, "contributors_amount", this);
            this.calculated(this.getOtherContributorsAmount, "other_contributors_amount", this);
            this.calculated(this.toMigrate, "to_migrate", this);
            this.calculated(this.isUpdated, "is_updated", this);
            this.calculated(this.htmlDescription, "html_description", this);
            this.calculated(this.getPolicies, "policies", this);
            this.calculated(this.getNotesAmount, "notes_amount", this);
            this.calculated(this.getUrlsAmount, "urls_amount", this);
            this.calculated(this.hasSections, "has_sections", this);
            this.calculated(this.getSectionsAmount, "sections_amount", this);
            this.calculated(this.fullUrl, "full_url", this);
            this.calculated(this.getSlug, "slug", this);
        },

        parse: function (response) {
            var contributors = [];
            var authors      = _.uniq(_.union([response.user_id], _.pluck(response.contributors, "user_id")));
            var others       = _.uniq(_.pluck(response.urls, "user_id"));
            var other_contributors = _.map(_.difference(others, authors), function (u) { return { user_id: u }; });

            response.author = new model.Profile({ user_id: response.user_id });
            response.userauthor = new model.User({ user_id: response.user_id });

            response.contributors = new collection.Contributors(
                response.contributors, { parse: true });

            response.other_contributors = new collection.Users(
                other_contributors, { parse: true });

            for (var i = 0; i < response.urls.length; i++)
                response.urls[i].by_contributor = response.urls[i].user_id != response.user_id;

            response.urls = new collection.Urls(response.urls,
                { parse: true, urlist: this });

            response.followers = new collection.Users(response.followers);

            response.comments = new collection.Comments(response.comments,
                { parse: true });

            var sections = new collection.Sections();
            sections.reset( response.sections, { urlist: this, urls: response.urls, sections: sections });
            response.sections = sections;

            response.categories = response.categories || [];

            response.__load_time = new Date();

            return response;
        },
        superOld: function () {
            this.set("__load_time", -1);
        },

        getFollowersAmount: function () {
            return this.get("followers").length;
        },

        getLabelCategories: function () {
            return this.getCategories().join(", ");
        },

        getCategories: function () {
            return _.map(this.get("categories", []), function (c) {
                return UL.CATEGORIES[c].label; });
        },

        age: function (update) {
            if (update != undefined) {
                this.set("__load_time", new Date());
                return;
            }

            var ut = this.get("__load_time"),
                delta;

            if (ut == -1)
                return 24 * 60 * 1000;

            if (!ut)
                return 0;


            delta = new Date().getTime() - ut.getTime();
            return delta;
        },

        hasUrl: function (url) {
            return this.get("urls").where({ url: url }).length > 0;
        },

        getUrlByHash: function (urlHash) {
            return this.get("urls").get(urlHash);
        },

        isReady: function () {
            return this.has("urls");
        },

        removeUrl: function (url) {
            var urlsCollection = this.get("urls");

            urlsCollection.remove(url);

            this.message("remove-url", { hash: url.get("hash") });
        },

        changeTitle: function (title) {
            this.set("title", title);
            this.enqueue("change-title", { title: title });
        },

        changeDescription: function (description) {
            this.set("description", description);
            this.enqueue("change-description", { description: description });
        },

        lastPositionForSection: function (sectionPosition) {
            return this.get("sections").chain()
                .first(sectionPosition)
                .map(function (e) { return e.getLocalUrls(); })
                .flatten()
                .map(function (e) { return e.get("position"); })
                .max()
                .value() || 1;
        },

        firstPositionForSection: function (sectionPosition) {

        },


        /**
        * calculated properties
        */

        getContributorsAmount: function () {
            return this.get("contributors").length + this.get("other_contributors").length;
        },

        getOtherContributorsAmount: function () {
            return this.get("contributors").length + this.get("other_contributors").length;
        },

        getNotesAmount: function () {
            var amount = 0;
            this.get("urls").each(function (url) {
                url.get("description") !== undefined && amount++;
            });
            return amount;
        },

        getUrlsAmount: function () {
            return this.get("urls").length;
        },

        hasSections: function () {
            return this.get("sections").length > 1;
        },

        getSectionsAmount: function () {
            return this.get("sections").length;
        },

        getPolicies: function () {
            return helpers.generatePolicy("urlist", C.get("user"), this);
        },

        isMine: function () {
            return C.get("user").get("user_id") == this.get("user_id");
        },

        isUpdated: function () {
            // Check if the list has been updated, comparing
            // the `last_action_time` (representing the time stamp for the last
            // **add link**) with `last_visit` (representing the last time the
            // user accessed the list)

            var at, lv, me, delta;

            at = this.get("last_action_time");
            lv = this.get("last_visit");
            me = this.get("last_action_id") == C.get("user").get("user_id");

            // We may not have the values, this means that we don't have
            // info about the last visit.
            if (me || !at || !lv) return;

            at = new Date(at);
            lv = new Date(lv);

            // Calculate the seconds passed after the last update.
            delta = parseInt((at.getTime() - lv.getTime()) / 1e3);

            return delta > -10;
        },

        toMigrate: function () {
            return this.get("is_secret") && this.get("creation_time") < "2013-03-10T22:30:00";
        },

        toCategorize: function () {
            return C.get("user").getMyListsCount() > 1 &&
                   !this.get("is_secret") &&
                   this.isMine() &&
                   !this.get("categories").length;
        },

        toJoin: function () {
            return this.get("contributors").where({
                    user_id: C.get("user").get("user_id"),
                    status: "pending"
                }).length == 1;
        },

        htmlDescription: function() {
            return mdma(this.get("description"), true);
        },

        canEdit: function() {
            return this.get("can_edit_list");
        },

        fullUrl: function () {
            return UL.config.origin + "/" + this.get("hash");
        },

        getSlug: function () {
            var prefix = this.get("hash") + "-"
            return decodeURI(this.get("slug").replace(prefix, ""));
        },

        toTweet: function() {
            var url = this.fullUrl(),
                settings = this.get("settings");

            var charleft = 140 - url.length + 2;
            var head = this.get("title");

            if (head.length > charleft) {
                // 1 for the ellipsis
                head = this.get("title").substr(0, charleft - 1) + "…";
            }

            return '"{0}" {1}'.format(head, url);
        }

    });

    ul.register('model.Urlist', UrlistModel);
}) ();

