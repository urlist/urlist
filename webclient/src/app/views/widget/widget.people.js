view.widget.People = ul.bbext.View.extend({

    initialize: function () {
        this.urlist = this.options.urlist;
        this.activeContributors = this.collection.where({ status: "accepted" });
    },

    deferredRenderAuthor: function (author) {
        var template = ul.util.t("widget/people.author"),
            json = author.toJSON(),
            html = template(json);

        this.$(".js-screenname").text(json.screen_name.crop(14));
        this.$(".js-screenname").attr("href", "/library/" + json.username);
        this.$(".js-avatars").prepend(html);
    },

    renderAuthor: function (author) {
        author.whenReady().done( _.bind(this.deferredRenderAuthor, this, author) );
    },

    renderContributor: function (contributor) {
        var template = ul.util.t("widget/people.contributor"),
            $html = template(contributor.toJSON());

        this.$(".js-avatars").append($html);
    },

    renderContributors: function (contributors) {
        var that = this;

        _.chain(this.activeContributors)
            .first(4)
            .each(function (contributor) {
                contributor.whenReady().done( _.bind(that.renderContributor, that, contributor) );
            });
    },

    render: function () {
        var template = ul.util.t("widget/people"),
            html = template({
                contributors_amount: this.activeContributors.length
            });

        this.$el.html(html);

        this.renderAuthor(this.model);
        this.renderContributors(this.collection);

        return this.$el;
    }

});

