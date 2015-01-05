view.urlist.People = ul.bbext.View.extend({

    initialize: function () {
        this.urlist = this.options.urlist;
        this.listenTo(this.collection, "add remove", this.updateContributorsCounter);
        this.listenTo(this.collection, "add", this.renderContributor);
        this.listenTo(this.collection, "remove", this.removeContributor);
    },

    updateContributorsCounter: function () {
        this.$(".js-contributors-count").text(this.collection.length);
    },

    renderAuthor: function (author) {
        var that = this,
            template = ul.util.t("urlist/people.author"),
            $el = this.$(".ui-author");

        author.whenReady().done( function () {
            $el.html(template(author.toJSON()));
            that.trigger("widgetReady");
        });
    },

    renderContributor: function (contributor) {
        var that = this,
            template = ul.util.t("urlist/people.contributor"),
            el = this.$(".js-contributors-list");

        contributor.whenReady().done( function () {
            el.append(template(contributor.toJSON()));
            that.trigger("widgetReady");
        });

        this.$(".js-contributors-container").removeClass("hide");
    },

    renderOtherContributor: function (contributor) {
        var that = this,
            template = ul.util.t("urlist/people.contributor"),
            el = this.$(".js-other-contributors-list");

        contributor.whenReady().done( function () {
            el.append(template(contributor.toJSON()));
            that.trigger("widgetReady");
        });

        this.$(".js-other-contributors-container").removeClass("hide");
    },

    removeContributor: function (contributor) {
        this.$(".collaborators-list .js-contributor[data-user-id='{0}']".format(contributor.id))
            .fadeOut();
    },

    renderContributors: function (contributors) {
        var that = this;

        contributors.each( _.bind(this.renderContributor, this) );
    },

    renderOtherContributors: function (contributors) {
        var that = this;

        contributors.each( _.bind(this.renderOtherContributor, this) );
    },

    render: function () {
        var template = ul.util.t("urlist/people"),
            policies = this.urlist.getPolicies(),
            html = template({
                contributors_amount: this.urlist.getContributorsAmount(),
                other_contributors_amount: this.options.otherCollection.length,
                policies: policies });

        this.$el.html(html);

        this.renderAuthor(this.model);
        this.renderContributors(this.collection);
        this.renderContributors(this.options.otherCollection);

        return this.$el;
    }

});

