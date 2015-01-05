model.Category = ul.bbext.Model.extend({
    name: "model.Category",

    urlRoot: API_ROOT + "list-by-categories",

    idAttribute: "id",

    initialize: function () {
        this.calculated(this.fullUrl, "full_url", this);
    },

    isReady: function () {
        return this.has("lists");
    },

    getSlug: function () {
        return slugify(this.get("name"));
    },

    getId: function () {
        if (this.get("id"))
            return this.get("id");

        return _.find(UL.CATEGORIES, function (e) { return e.slug == this.get("name") }, this).id;
    },

    url: function () {
        var u = this.urlRoot + "/" + this.getId();

        if (this.has("sort")) {
            u = addParamToUrl(u, "sort", this.get("sort"));
        }

        if (this.has("network")) {
            u = addParamToUrl(u, "network", this.get("network"));
        }

        return u;
    },

    fullUrl: function () {
        return UL.config.origin + "/category/" + this.get("name");
    },

    toTweet: function () {
        return "A lot of great lists about #{0}: {1}".format(this.get("name"), this.fullUrl());
    },

    parse: function (response) {
        response = ul.util.kato(response, "lists", "hash");
        response.lists = new collection.Urlists(response.lists, { sort: false });

        response.slug = slugify(this.get("name"));

        return response;
    }

});
