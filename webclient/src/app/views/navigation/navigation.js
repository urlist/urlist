view.navigation.Navigation = ul.bbext.View.extend({

    events: {
        "click .js-edit-url" : "editUrlCallback",
        "click .js-relist": "relistCallback",
        "click .js-open-details" : "showDetails",
        "click .js-close-navigation" : "exitNavigation"
    },

    initialize: function () {
        this.collection = this.model.get("urls");
        this.listenTo(this.collection, "remove", this.deleteAndNext);
    },

    deleteAndNext: function () {
        this.$(".js-nav-next").click();
    },

    goHash: function (url_hash) {
        var urlModel = this.collection.where({ hash: url_hash })[0];
        return this.goUrlModel(urlModel);
    },

    goUrlModel: function (urlModel) {
        var current = this.collection.indexOf(urlModel),
            total   = this.collection.length,
            prev    = (current <= 0 ? total : current) - 1,
            next    = (current + 1) % total,
            prevUrl = this.collection.at(prev),
            nextUrl = this.collection.at(next),
            that    = this;

        this.currentUrl = urlModel;

        UL.Embed(urlModel.toJSON())
            .done(function (html) {
                that.$(".js-embed").html(html);
            })
            .fail(function () {
                var html = ul.util.t("embed/__not_embeddable")(urlModel.toJSON());
                that.$(".js-embed").html(html);
            });

        this.$(".js-nav-prev").attr("href", prevUrl.getFullUrl());
        this.$(".js-nav-next").attr("href", nextUrl.getFullUrl());

        this.$(".js-nav-title")
            .attr({
                "href" : this.currentUrl.get("url"),
                "target" : "_blank"
            })
            .find(".label")
            .text(this.currentUrl.get("url"));

        this.$(".js-nav-current").text(current + 1);
        this.$(".js-nav-total").text(total);

        setDocumentTitle(urlModel.get("title"));

        this.renderSidebar();
        this.documentScript();
    },

    renderSidebar: function () {
        if (this.sidebarView)
            this.sidebarView.unbindMe();

        this.sidebarView = new view.navigation.Sidebar({
            model: this.model,
            currentUrlModel: this.currentUrl
        });

        this.$(".js-nav-sidebar-placeholder").html(this.sidebarView.render());
    },

    render: function () {
        var template = ul.util.t("navigation/main"),
            json     = {
                current   : 1,
                hash      : this.model.get("hash"),
                total     : this.collection.length,
                title     : this.model.get("title"),
                is_secret : this.model.get("is_secret"),
                policies  : this.model.getPolicies()
            };

        this.$el.html(template(json));

        return this.$el;
    },

    editUrlCallback: function (e) {
        var dialog = new view.dialog.EditUrl({
                model: this.currentUrl,
                dialogClass: "dialog-settings",
                closeOnOverlay: true
            });

        dialog.render();
    },

    relistCallback: function (e) {
        var dialog = new view.dialog.RelistUrl({
                model: this.currentUrl,
                dialogClass: "dialog-settings",
                closeOnOverlay: true,
                sourceEvent: e
            });

        dialog.render();
    },

    showDetails: function (e) {
        e.preventDefault();

        $(e.target).toggleClass("active");
        $(".js-nav-sidebar-placeholder").toggleClass("hide");
    },

    documentScript: function () {
        $("#header, #footer").hide();

        $(".js-embed").height((window.innerHeight - $(".top-bar").height()) + "px");
        $(".js-embed, .resource-section").height((window.innerHeight - $(".top-bar").height()) + "px");
        $(".js-nav-sidebar-placeholder").height( ($(".js-embed").height() - 50) + "px");

        $(window).resize(function(){
            $(".js-embed, .resource-section").height((window.innerHeight - $(".top-bar").height()) + "px");
            $(".js-nav-sidebar-placeholder").height( ($(".js-embed").height() - 50) + "px");
        });
    },

    afterRender: function () { // left for future

        var beforeLinkListHeight = 0;

        $(".link-list").prevAll().each( function(){ beforeLinkListHeight += $(this).outerHeight(); });

    },

    exitNavigation: function() {
    }

});

