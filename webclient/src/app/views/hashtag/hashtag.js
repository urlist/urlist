view.Hashtag = ul.bbext.View.extend({

    events: {
        // "click .js-share-share" : "shareCategory"
        "click .js-save-search": "saveSearch"
    },

    initialize: function () {
        this.template = ul.util.t("hashtag/hashtag");
        this.hashtag = "#{0}".format(this.model.get("hashtag"));
    },

    renderWidgets: function () {
        var widgetListView = new view.widget.WidgetList({
            collection: this.model.get("lists"),
            el: this.$(".widget-wrapper")
        });

        widgetListView.render();
        this.currentView = widgetListView;
    },

    render: function () {
        var that = this,
            json = this.model.toJSON(),
            savedSearches = C.get("user").get("saved_searches");

        json.saved = savedSearches.where({ query: this.hashtag }).length > 0;

        this.$el.html(this.template(json));
        this.model.whenReady().done(
            _.bind(this.renderWidgets, this)
        );
        this.documentScript();
    },

    documentScript: function () {
        // Update the main Header, not relevant to the view itself
        $(".js-app-navigation li").removeClass("active");
        $(".js-app-navigation").addClass("active");
    },

    saveSearch: function (e) {
        // Hide [save search] button
        $(e.target).fadeOut(250);
        // Send data to server using our actions
        UL.Broker.push("add-saved-search", {}, { query: this.hashtag });
    }

    // shareCategory: function () {
    //     var dialog = new view.dialog.ShareList({
    //         model: this.model,
    //         closeOnOverlay: true
    //     });

    //     dialog.render();

    //     return false;
    // },
});

