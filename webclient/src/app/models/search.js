model.Search = ul.bbext.Model.extend({

    idAttribute: "query",

    urlRoot: API_ROOT + "search?q={0}&scope={1}",

    url: function () {
        return this.urlRoot.format(encodeURIComponent(this.id), this.get("scope"));
    },

    isReady: function () {
        return this.has("results");
    },

    getUrlists: function () {
        return new collection.Urlists(_.map(this.toJSON().results, function (r) {
                return { hash: r.list_hash };
            }), { sort: false });
    },

    parse: function(response) {
        response.stems     = response.stemmed_query.split(" ");
        response.withLinks = _.filter(response.results, function (r) { return r.urls.length > 0 });
        return response;
    }

});

