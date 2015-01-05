view.urlist.Url = ul.bbext.View.extend({

    events: {
        "click .js-toggle-relist"     : "renderRelist",
        "click .js-edit"            : "editCallback",
        "click .js-relist"          : "relistCallback",
        "click .js-move-url"        : "moveListCallback",

        // share
        "click .js-url-share-gplus"   : "shareOnGoogle",
        "click .js-url-share-twitter" : "shareOnTwitter",
        "click .js-url-share-facebook": "shareOnFacebook"
    },

    initialize: function () {
        this.template = ul.util.t("urlist/url.common");
        this.parent = this.options.parent;

        this.listenTo(this.model, "change:_status", this.changeStatus);
        this.listenTo(this.model, "change:hash", this.changeHash);
        this.listenTo(this.model, "change:position", this.changePosition);
        this.listenTo(this.model, "change:title", this.changeTitle);
        this.listenTo(this.model, "change:description", this.changeDescription);
        this.listenTo(this.model, "change:favicon", this.changeFavicon);
        this.listenTo(this.model, "destroy", this.destroy);
    },

    renderRelist: function (e) {
        var currentTarget = $(e.currentTarget);
        var relistContainer = this.$(".js-relist-container");
        var trigger = "js-switch";

        if (currentTarget.hasClass(trigger)) {
            relistContainer.hide();
        } else {
            relistContainer.show();
        }

        this.$(".js-toggle-relist").toggleClass(trigger);

        var relistView = new view.urlist.Relist({
            model: this.model,
            el   : this.$(".js-relist-container")
        });

        relistView.render();
    },

    deferredAuthorRender: function () {
        var author = this.model.get("relistedFromAuthor");
        this.$(".js-relist-author").text(author.get("screen_name"));
    },

    renderContributor: function () {
        var $el    = this.$(".js-url-author"),
            author = this.model.get("author");

        author.whenReady().done(function () {
            $el.attr("href", "/library/" + author.get("username"));
            $el.text(author.get("screen_name"));
        });
    },

    renderAuthor: function () {
        if (!this.model.has("relistedFromAuthor"))
            return;

        var author = this.model.get("relistedFromAuthor");
        author.whenReady()
            .done( _.bind(this.deferredAuthorRender, this));
    },

    render: function () {
        var model = this.model,
            list_hash = model.get("list_hash"),
            url_hash = model.get("hash"),
            json = model.toJSON({ calculated: true }),
            $html, $subhtml;

        if (this.model.needsFavicon())
            UL.Broker.push(
                "fetch-url-data",
                { list_hash: list_hash, url_hash: url_hash },
                { key: "favicon" });

        json.digits = (this.model.get("position") + "").length;

        $html = this.template(json);

        this.setElement($html);
        this.renderAuthor();
        this.renderContributor();

        this.trigger("widgetReady");

        this.documentScript();

        return this.$el;
    },

    changeStatus: function (model, value) {
        this.$el
            .removeClass("status-" + model.previous("_status"))
            .addClass("status-" + model.get("_status"));
    },

    changeHash: function (model, value) {
        var list_hash = model.get("list_hash"),
            url_hash = model.get("hash"),
            full_url = [list_hash, url_hash].join("/");

        this.$(".js-url-title").attr("href", full_url);
        this.$el.attr("data-hash", value);

        if (this.model.needsFavicon())
            UL.Broker.push(
                "fetch-url-data",
                { list_hash: list_hash, url_hash: url_hash },
                { key: "favicon" });

    },

    changePosition: function (model, value) {
        var prevDigits = (model.previous("position") + "").length,
            digits = (value + "").length;

        this.$(".js-url-position")
            .removeClass("n{0}-pos".format(prevDigits))
            .addClass("n{0}-pos".format(digits))
            .text(value);
    },

    changeTitle: function (model, value) {
        this.$(".js-url-title").text(value);
    },

    changeDescription: function (model, value) {
        this.$(".js-note").toggleClass("hide", !model.get("description") || !model.get("description").length);
        this.$(".js-note .js-text").html(model.htmlDescription());
    },

    changeFavicon: function (model, value) {
        this.$(".js-favicon").attr("src", value);
    },

    shareCallback: function (e) {
    },

    editCallback: function (e) {
        var dialog = new view.dialog.EditUrl({
                model: this.model,
                dialogClass: "dialog-settings",
                closeOnOverlay: true
            });

        dialog.render();
    },

    moveListCallback: function (evnt) {
        var dialog = new view.dialog.MoveUrl({
            model: this.model,
            dialogClass: "dialog-settings",
            closeOnOverlay: true,
            sourceEvent: evnt
        });
        dialog.render();
    },

    relistCallback: function (e) {
        if (ul.dialog.requireSignup()) return false;

        var dialog = new view.dialog.RelistUrl({
            model: this.model,
            dialogClass: "dialog-settings",
            closeOnOverlay: true,
            sourceEvent: e
        });

        dialog.render();

        return false;
    },

    destroy: function() {
        this.unbindMe();
    },

    shareOnTwitter: function () {
        twitterShare(this.model.toTweet());
        return false;
    },

    shareOnFacebook: function () {
        facebookShare(this.model.fullUrl());
        return false;
    },

    shareOnGoogle: function () {
        googleShare(this.model.fullUrl());
        return false;
    },

    documentScript: function () {}

});

view.widget.Url = view.urlist.Url.extend({
    initialize: function () {
        this.template = ul.util.t("widget/url");
    },

    renderAuthor: function () {
        var that = this,
            author = this.model.get("author");

        author.whenReady()
            .done(function () {
                that.$(".js-author a").attr("href", "/library/"+author.get("username"));
                that.$(".js-author .js-username").text(author.get("screen_name"));
                that.$(".js-author img").attr("src", author.get("profile_image"));
            });
    }

});

