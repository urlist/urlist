view.search.Links = ul.bbext.View.extend({

    events: {
        "click .js-save-search": "saveSearch",
        "click .js-relist": "relist"
    },

    initialize: function () {
        this.template = ul.util.t("search/links");
    },

    relist: function (evnt) {
        if (!!C.get("user").get("is_anonymous")) return false;

        var $target = $(evnt.target).closest("a");
        var that = this;
        var listHash = $target.attr("data-listhash");
        var urlHash = $target.attr("data-urlhash");

        var urlistModel = new ul.model.Urlist({ hash: listHash });
        urlistModel.whenReady().done(function () {
            that.urlModel = urlistModel.get("urls").where({ hash: urlHash })[0]

            var dialog = new view.dialog.RelistUrl({
                model: that.urlModel,
                dialogClass: "dialog-settings",
                closeOnOverlay: true,
                sourceEvent: evnt
            });
            dialog.render();
            return false;
        });
    },

    deferredRender: function () {
        var json = this.model.toJSON(),
            savedSearches = C.get("user").get("saved_searches"),
            query = this.model.get("query");

        json.saved = savedSearches.where({ query: query }).length > 0;

        this.$el.html(this.template(json));
        this.trigger("widgetReady");
    },

    render: function () {
        this.model.whenReady().done( _.bind(this.deferredRender, this) );

        return this.$el;
    },

    saveSearch: function () {
        this.$(".js-save-search").remove();
        UL.Broker.push("add-saved-search", {}, { query: this.model.get("query") });
    }

});
