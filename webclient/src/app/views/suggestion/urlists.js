view.suggestion.Urlists = ul.bbext.View.extend({

    initialize: function () {
        var categories = this.model.get("categories");

        if (categories.length > 0)
            this.db = new model.Category({
                        id     : categories[0],
                        network: false,
                        sort   : "popularity"
                    });
        else
            this.db = new model.DiscoveryPopular();
    },

    addUrlist: function (urlistModel) {
        var that = this,
            urlistView = new view.suggestion.Urlist({
                model: urlistModel
            });

        this.listenTo(urlistView, "widgetReady", function () { that.trigger("widgetReady"); });

        this.tickerCount++;
        this.$("ul").append( urlistView.render() );
    },

    render: function () {
        var that = this,
            template = ul.util.t("suggestion/urlists");

        this.$el.html($(template()));

        this.db.whenReady()
            .done(function () {
                var urlists = _.first(that.db.get("lists").shuffle(), 6);
                that.collection = new collection.Urlists(urlists);
                that.collection.each(that.addUrlist, that);
            });

        return this.$el;
    }

});

