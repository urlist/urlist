view.search.Search = ul.bbext.View.extend({

    events: {
        "submit form"           : "submitSearch",
        "click .js-save-search" : "saveSearch"
    },

    initialize: function () {
        this.template = ul.util.t("search/search");

        if (this.options.query)
            this.model = new model.Search({ query: this.options.query });

    },

    saveSearch: function (evnt) {
        this.$(evnt.target).addClass("hide");
        UL.Broker.push("add-saved-search", {}, {query: this.model.get("query") });
    },

    submitSearch: function () {
        var query = this.$("input[name='query']").val();

        UL.Router.navigate("/search/{0}".format(query), { trigger: true });
        return false;
    },

    renderLists: function () {
        var results = new view.widget.WidgetList({
                el        : this.$(".js-widgets-hook"),
                collection: this.model.getUrlists(),
                limit: 20
            });

        results.render();
    },

    renderLinks: function () {
        var results = new view.search.Links({
                el   : this.$(".js-widgets-hook"),
                model: this.model
            });

        results.render();
    },

    renderSearch: function () {
        var json = this.model.toJSON();

        if (this.options.display == "links")
            this.renderLinks();
        else
            this.renderLists();

        this.$(".js-stats-hook").html(ul.util.t("search/stats")(json));
    },

    render: function () {
        var json = this.model.toJSON();

        this.$el.html(this.template(json));
        this.model.whenReady().done(_.bind(this.renderSearch, this));

        this.$("[data-location='{0}']".format(json.scope)).addClass("active");
        this.$("[data-location='{0}']".format(this.options.display)).addClass("active");

        return this.$el;
    }

});

