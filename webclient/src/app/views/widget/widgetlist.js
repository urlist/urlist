view.widget.WidgetList = ul.bbext.View.extend({

    el: "div.widget-wrapper",

    events: {
        "click .js-load-more": "renderWidgetsSlice"
    },

    initialize: function () {
        this.limit = this.options.limit;
        this.autoload = this.options.autoload !== false;
        this.showloader = this.options.showloader !== false;
        this.View = this.options.View || view.widget.Widget;

        this.page = this.options.page || 1;
        this.limit = this.options.limit || 20;

        if (this.autoload) this.listenTo(UL.Broker, "document-bottom", this.renderWidgetsSlice);

        this.loadTemplate = this.options.loadTemplate || ul.util.t("widget/loadmore");
        this.customBlockFirst = this.options.customBlockFirst;
    },

    addWidget: function (list, isFeatured) {
        var widget = new this.View({ model: list, isFeatured: isFeatured });

        widget.render();
        this.$wc.append( widget.$el );
    },

    renderWidgetsSlice: function (e) {
        var that     = this,
            rendered = this.$wc.find(".widget-card").length,
            amount   = this.limit * this.page,
            left     = this.collection.length - rendered - amount,
            currentList;


        for (var i = rendered; i < rendered + amount && i < this.collection.length; i++) {
            currentList = this.collection.at(i);
            this.addWidget(
                currentList,
                _.indexOf(this.collection.featured, currentList.get("hash")) != -1);
        }

        if (!this.autoload && left <= 0 ) this.$(".js-load-more").addClass("inactive").fadeTo(400, 0);

        return false;
    },

    render: function () {
        this.$wc = $("<div />", { "class": "widget-container deck" });

        this.$el.append( this.$wc );

        if (this.customBlockFirst) {
            this.$wc.prepend( this.customBlockFirst );
        }

        if (!this.autoload && this.showloader) this.$el.append(this.loadTemplate());

        this.renderWidgetsSlice();

        this.trigger("widgetReady");
    }

});

