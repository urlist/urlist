view.dashboard.SavedSearch = ul.bbext.View.extend({

    tagName: "li",

    events: {
        "click .js-search-delete": "deleteSearch"
    },

    initialize: function () {
        this.listenTo(this.model, "destroy", this.destroy);
    },

    destroy: function () {
        this.unbindMe();

        return false;
    },

    render: function () {
        var template = ul.util.t("dashboard/savedsearches.item"),
            json = this.model.toJSON();

        this.$el.html(template(json));
        return this.$el;
    },

    deleteSearch: function () {
        UL.Broker.push("remove-saved-search", { search_id: this.model.id, query: this.model.get("query") });
    }

});
