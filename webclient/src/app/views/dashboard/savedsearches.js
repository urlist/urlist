view.dashboard.SavedSearches = ul.bbext.View.extend({

    initialize: function () {
        this.listenTo(this.collection, "add remove", this.updateAmount);
        this.listenTo(this.collection, "add", this.addSavedSearch);
    },

    updateAmount: function () {
        this.$(".js-amount").text( this.collection.length );
    },

    addSavedSearch: function (savedSearchModel) {
        var savedSearchView = new view.dashboard.SavedSearch({
            model: savedSearchModel
        });

        this.$("ul").append(savedSearchView.render());
    },

    render: function () {
        var template = ul.util.t("dashboard/savedsearches");
        this.$el.html(template({ searches_amount: this.collection.length }));
        this.collection.each( _.bind( this.addSavedSearch, this ) );
        return this.$el;
    }

});
