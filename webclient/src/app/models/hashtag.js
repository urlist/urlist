model.Hashtag = ul.bbext.Model.extend({
    //name: "model.Hashtag",

    urlRoot: API_ROOT + "hashtag",

    idAttribute: "id",

    initialize: function () {
        this.calculated(this.fullUrl, "full_url", this);
    },

    isReady: function () {
        return this.has("lists");
    },

    getSlug: function () {
        return slugify(this.get("hashtag"));
    },

    url: function () {
        var u = this.urlRoot + "/" + slugify(this.get("hashtag"));

        if (this.has("sort")) {
            u = addParamToUrl(u, "sort", this.get("sort"));
        }

        if (this.has("network")) {
            u = addParamToUrl(u, "network", this.get("network"));
        }

        return u;
    },

    fullUrl: function () {
        return UL.config.origin + "/hashtag/" + this.get("hashtag");
    },

    toTweet: function () {
        return "A lot of great lists about #{0}: {1}".format(this.get("hashtag"), this.fullUrl());
    },

    parse: function (response) {
        response = ul.util.kato(response, "lists", "hash");
        response.lists = new collection.Urlists(response.lists, { sort: false });

        response.slug = slugify(this.get("hashtag"));

        return response;
    }

});
