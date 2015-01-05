view.Category = ul.bbext.View.extend({

    events: {
        "click .js-share-share" : "shareCategory"
    },

    initialize: function () {
        this.template = ul.util.t("category/category");
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
            json = this.model.toJSON();

        json.label = _.findWhere(UL.CATEGORIES, { slug: json.name }).label;

        this.$el.html(this.template(json));
        this.model.whenReady().done(
            _.bind(this.renderWidgets, this)
        );
        this.documentScript();
    },

    shareCategory: function () {
        var dialog = new view.dialog.ShareList({
            model: this.model,
            closeOnOverlay: true
        });

        dialog.render();

        return false;
    },

    documentScript: function () {}

});

