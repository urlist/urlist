view.widget.Widget = ul.bbext.View.extend({

    events: {

        // Callback for List Widget
        "click .js-edit-list"           : "editCallback",
        "click .js-edit-contributors"   : "editContributorsCallback",
        "click .js-edit-categories"     : "editCategories",
        "click .js-delete-list"         : "deleteListCallback",

        // Migrate
        "click .js-migrate-list"        : "migrateToPublicCallback",

        // Sharing
        "click .js-share-list"          : "shareList",

        // Toggling Follow button
        "click .widget-actions"         : "toggleFollow",

        // Callbacks for Follow button
        "click .js-follow-list"         : "followList",
        "click .js-unfollow-list"       : "unfollowList"
    },


    SECTION_NAMES_MAP: ["orange", "green", "red", "blue", "purple"],

    className: "widget widget-card",

    initialize: function () {
        this.template = this.options.template || ul.util.t("widget/common");
        this.details = this.options.details === undefined ? true : this.options.details;

        this.listenTo(this.model, "destroy", this.destroyCallback);

        this.listenTo(this.model, "change:title", this.changeTitle);
        this.listenTo(this.model, "change:description", this.changeDescription);
        this.listenTo(this.model, "change:is_secret", this.changeSecret);
        this.listenTo(this.model, "change:categories", this.changeCategories);
    },

    deleteListCallback: function (e) {
        var dialog = new view.dialog.DeleteList({
                model: this.model,
                closeOnOverlay: true
            });

        dialog.render();

        return false;
    },

    migrateToPublicCallback: function (e) {
        var that = this,
            dialog = new view.dialog.MigrateList({
                model: this.model,
                dialogClass: "dialog-settings",
                closeOnOverlay: true
            });

        dialog.render();

        dialog.once("submit", function () {
            UL.Broker.push("update-list", { list_hash: that.model.get("hash") }, { is_secret: false });
            that.$(".js-migrate-list").hide().next().removeClass("hide");
        });

        return false;
    },

    followList: function (e) {
        if (ul.dialog.requireSignup()) return false;

        var hash = this.model.get("hash");

        // XXX: must be refactored soon
        UL.EventOriginator.push(e.getSource());

        UL.Broker.push("follow-list", { list_hash: hash });

        if (UL.Router.current.name == "dashboard")
            this.$el.fadeTo("fast", 1);
    },

    unfollowList: function (e) {
        var hash = this.model.get("hash");

        // XXX: must be refactored soon
        UL.EventOriginator.push(e.getSource());

        UL.Broker.push("unfollow-list", { list_hash: hash });

        if (UL.Router.current.name == "dashboard")
            this.$el.fadeTo("fast", 0.5);
    },

    shareList: function () {
        var dialog = new view.dialog.ShareList({
            model: this.model,
            closeOnOverlay: true
        });

        dialog.render();

        return false;
    },

    destroyCallback: function () {
        var that = this;

        this.$el.fadeOut("500", function () {
            that.trigger("widgetRemoved", that.$el);
            that.unbindMe();
        });
    },

    renderChart: function () {
        var urls = this.model.get("urls").first(10), // 3
            list_hash = this.model.get("hash"),
            template = ul.util.t("widget/chart"),
            json = { urls: [] };

        _(urls).each( function (u, i) {
            json.urls.push({
                position: i + 1,
                title: u.get("title"),
                url: "/" + list_hash,
                favicon: u.get("favicon")
            });
        });


        this.$(".sublist").append( template(json) );
    },

    renderReference: function () {
        var that = this,
            hash = this.model.get("hash"),
            sections = this.model.get("sections"),
            template = ul.util.t("widget/reference"),
            json = { sections: [] };

        sections.each(function (section, i) {
            json.sections.push( {
                slug: section.getTitleSlug(),
                hash: hash,
                title: section.get("title"),
                empty_title: section.get("empty_title"),
                color: that.SECTION_NAMES_MAP[i],
                urls_amount: section.getUrlsAmount()
            } );
        });

        this.$(".sublist").append( template(json) );

    },

    renderPeople: function () {
        var peopleView = new view.widget.People({
            model: this.model.get("userauthor"),
            collection: this.model.get("contributors")
        });

        this.$(".js-widget-people").replaceWith(peopleView.render());
    },

    deferredRender: function () {
        var json = this.model.toJSON({ calculated: true }),
            $html;

        json.details = this.details;
        $html = this.template(json);

        this.$el.html($html);

        if (this.details) {
            if (this.model.get("sections").length > 1) {
                this.renderReference();
                this.$el.addClass("reference");
            } else {
                this.renderChart();
                this.$el.addClass("chart");
            }
        }

        this.renderPeople();

        if (this.options.isFeatured)
            this.$el.addClass("featured");

        var $cover = this.$el.find(".widget-preheader figure");

        if (json.cover_image) {
            // as suggested in stackoverflow.com/q/11772638
            var newImage = new Image();

            newImage.src = "{0}?v={1}".format(json.cover_image, slugify(json.cover_image_v));

            newImage.onload = function () {
                $cover.addClass("has--cover");
                $cover.css("background-image", "url({0})".format(this.src));
            }
        } else {
            $cover.addClass("has--no-cover");
        }

        this.trigger("widgetReady", this.$el);
    },

    render: function () {
        this.model.whenReady().done( _.bind(this.deferredRender, this) );

        this.$el.attr("data-cid", this.model.cid);
        return this.$el;
    },

    changeTitle: function (model, value) {
        this.$(".js-list-title").text(value);
    },

    changeDescription: function (model, value) {
        this.$(".js-list-description").html(model.htmlDescription());
    },

    editCallback: function (e) {
        var dialog = new view.dialog.SettingsList({
                model: this.model
            });

        dialog.render();

        return false;
    },

    editContributorsCallback: function (e) {
        var dialog = new view.dialog.Contributors({
            model: this.model
        });

        dialog.render();

        return false;
    },

    editCategories: function (e) {
        var dialog = new view.dialog.SelectCategory({
                model: this.model
            });

        dialog.render();

        return false;
    },

    changeSecret: function (model, value) {
        this.$(".js-is-secret").toggle(value);
    },

    changeCategories: function (model, value) {
        this.$(".js-list-categories")
            .removeClass("hide")
            .text(model.getCategories());
    },

    toggleFollow: function () {
        this.$(".widget-actions").toggleClass("status-following").addClass("following-new");
        this.$(".widget-actions").one("mouseleave", function () { $(this).removeClass("following-new"); });
    }

});

