view.suggestion.Urlist = ul.bbext.View.extend({

    tagName: "li",

    className: "suggest-list",

    events: { },

    renderUser: function () {
        var that   = this,
            author = this.model.get("author");

        author.whenReady().done(function () {
            that.$(".js-related-author").attr("href", "/library/" + author.get("username"));
            that.$(".js-related-author").text(author.get("screen_name"));
        });
    },

    render: function () {
        var that = this;

        this.model.whenReady().done(function () {
            var json = that.model.toJSON(),
                template = ul.util.t("suggestion/urlist"),
                html;

            html = template(json);

            that.$el.html(html);
            that.renderUser();

            that.trigger("widgetReady");
        });

        return this.$el;
    }

});
