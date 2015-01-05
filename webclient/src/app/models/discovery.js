model.Discovery = ul.bbext.Model.extend({

    name: "model.Discovery",

    url: API_ROOT + "discovery",

    isReady: function () {},

    parse: function (response) {
        // OK, the point is that we cannot associate `is_featured`
        // to a model.list. Why? Because if the list is featured
        // depends on the section where the list is rendered, and is not
        // a global property of the list...
        //
        // That's why we need to store in different arrays the IDs of the
        // featured lists.

        var reduceFeat = function (list) {
            return _.reduce(list, function (memo, l) { l.is_featured && memo.push(l.hash); return memo; }, []);
        };

        var reduceHash = function (list) {
            return _.reduce(list, function (memo, l) {
                memo.push({ hash: l.hash });
                return memo;
            }, []);
        };

        var top_lists_featured;

        // extract the hashes for featured lists
        top_lists_featured = reduceFeat(response.top_lists);

        // create collections using only the hashes
        response.top_lists = new collection.Urlists(reduceHash(response.top_lists));
        response.top_lists.featured = top_lists_featured;

        response.popular   = new collection.Urlists(reduceHash(response.popular));
        response.network   = new collection.Urlists(reduceHash(response.network));

        return response;
    }

});

model.DiscoveryPopular = ul.bbext.Model.extend({
    name            : "model.DiscoveryPopular",
    key             : "model.DiscoveryPopular",
    url             : API_ROOT + "popular",

    isReady: function () {
        return this.has("lists");
    },

    parse: function (response) {
        response.lists = new collection.Urlists(response.lists, { sort: false });
        return response;
    }
});

model.DiscoveryNetwork = ul.bbext.Model.extend({
    name            : "model.DiscoveryNetwork",
    url             : API_ROOT + "network/~",

    isReady: function () {
        return this.has("lists");
    },

    parse: function (response) {
        response.lists = new collection.Urlists(response.lists, { sort: false });
        return response;
    }
});

model.DiscoveryNetworkUrls = ul.bbext.Model.extend({
    name            : "model.DiscoveryNetworkUrls",
    url             : API_ROOT + "network/~/url",

    isReady: function () {
        return this.has("urls");
    },

    parse: function (response) {
        response.urls = new collection.Urls(response.urls, { sort: false, parse: true });
        return response;
    }
});

model.DiscoveryTopUsers = ul.bbext.Model.extend({
    // This is the data that is fed to the 'follow more' section of the Discovery.
    name            : "model.DiscoveryTopUsers",
    key             : "model.DiscoveryTopUsers",

    // we are feeding the Top Users thingy with a custom list
    url             : API_ROOT + "topusers",

    isReady: function () {
        return this.has("users");
    },


    parse: function (response) {
        response.users = new collection.Profiles(response.users);

        return response;
    },

});

