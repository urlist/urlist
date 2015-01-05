view.navigation.Sidebar = ul.bbext.View.extend({

    events: {
        // "click .js-relist": "relistCallback",

        // share
        "click .js-share-by-email"    : "shareListByEmail",
        "click .js-share-on-twitter"  : "shareListOnTwitter",
        "click .js-share-on-facebook" : "shareListOnFacebook",
        "click .js-share-on-google"   : "shareListOnGoogle"
    },

    initialize: function () {
        this.currentUrlModel = this.options.currentUrlModel;
        this.collection      = this.model.get("urls");
    },

    renderAuthor: function () {
        var that    = this,
            author  = this.currentUrlModel.get("author");

        author.whenReady()
            .done( function () {
                that.$(".js-author").text(author.get("screen_name"));
                that.$(".js-author").attr("href", "/library/" + author.get("username"));
            });
    },

    renderList: function () {
        this.model.get("sections").each(function (section) {
            var unorderedList = $("<ul />"),
                template = ul.util.t("navigation/url"),
                innerUrls = section.getLocalUrls();

            if (this.model.get("type") != "chart" && innerUrls.length > 0)
                this.$(".js-urls").append( $("<h5 class='list-section'>{0}</h5>".format(section.get("title"))));

            _.each(innerUrls, function (url) {
                var json = {
                    title: url.get("title"),
                    url  : url.getFullUrl(),
                    active: url.get("hash") == this.currentUrlModel.get("hash") ? "current" : ""
                };

                unorderedList.append( template(json) );

            }, this);

            this.$(".js-urls").append(unorderedList);

        }, this);
    },

    render: function () {
        var template = ul.util.t("navigation/sidebar"),
            json     = _.extend({
                current: this.collection.indexOf(this.currentUrlModel) + 1,
                total  : this.collection.length,
                title  : this.model.get("title"),
                type   : this.model.get("type"),
                urlist_hash : this.model.get("hash")
            }, this.currentUrlModel.toJSON({ calculated: true }));

        this.$el.html(template(json));

        this.renderAuthor();
        this.renderList();

        return this.$el;
    },

    shareListByEmail: function () {
        var dialog = new view.dialog.ShareListByEmail({
            model: this.model,
            dialogClass: "share-list-email",
            closeOnOverlay: true
        });

        dialog.render();

        return false;
    },

    shareListOnTwitter: function () {
        twitterShare(this.currentUrlModel.toTweet());
        return false;
    },

    shareListOnFacebook: function () {
        facebookShare(window.location);
        return false;
    },

    shareListOnGoogle: function () {
        googleShare(window.location);
        return false;
    }


});

