view.LandingPage = ul.bbext.View.extend({
    initialize: function () {
        this.model = new model.Landing();
    },

    renderWidgets: function () {
        var widgetListView = new view.widget.WidgetList({
            limit       : 8,
            collection  : this.model.get("lists"),
            el          : this.$(".widget-wrapper")
        });

        widgetListView.render();
        this.currentView = widgetListView;
    },

    render: function () {
        var template = ul.util.t("landing/main"),
            that = this;

        this.$el.html(template());

        this.model.whenReady().done(function () {
            that.renderWidgets();
        });

        this.documentScript();
    },

    documentScript: function () {
        $(".sticker-scrollTop").addClass("hide");
        $("body").addClass("landing-page");
        $(".js-landing-slider").orbit({
            animationSpeed  : 350,
            advanceSpeed    : 8000,
            fluid           : true,
            bullets         : true,
            directionalNav  : false
        });
        $("#footer").removeClass("hide");
    }

});

