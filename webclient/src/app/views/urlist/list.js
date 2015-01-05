view.urlist.List = ul.bbext.View.extend({

    events: {

        // Callbacks for List Page
        "click a[href=#]"             : "preventLink",

        "click .js-report-list"       : "reportCallback",

        // Suggest Link callbacks
        "click .js-suggest-link-add"  : "suggestLink",
        "click .js-suggested-links"   : "suggestedLinks",

        "click .js-edit-list"         : "editCallback",
        "click .js-edit-contributors" : "editContributorsCallback",
        "click .js-edit-sections"     : "settingsListSections",
        "click .js-add-section"       : "addSection",

        // Controls for the List Cover
        "click .js-upload-cover_close"  : "hideNewCover",
        "click .js-upload-cover_save"   : "confirmNewCover", // to change in submit, maybe
        "click .js-list-delete-cover"   : "removeCover",

        "click .js-image-upload-url"    : "uploadImageByUrl",
        "click .js-search-image"        : "searchImageCallback",

        // Events for the List Cover
        // "change .js-upload-cover_input" : "confirmNewCover",
        "change   .js-upload-cover_input" : "coverFileChange",

        // Sharing
        "click .js-share-list"        : "shareList",
        "click .js-embed-list"        : "embedListDialog",
        "click .js-for-clipboard"     : "selectForClipboard", // 1

        // Clear
        "mouseleave .js-url-item"     : "clearToggles",
        "mouseleave .js-header-inner" : "clearToggles",

        // Callbacks for Follow button
        "click .js-follow-list"       : "followList",
        "click .js-unfollow-list"     : "unfollowList",

        "click .js-show-followers"    : "showListFollowers"

        // 1. it's related to sharing, but should be global (original: base/dialog.js:25)
    },


    initialize: function () {
        this.template = this.options.template || ul.util.t("urlist/list");
        this.listenTo(this.model, "change:title", this.changeTitle);
        this.listenTo(this.model, "change:description", this.changeDescription);
        this.listenTo(this.model, "change:is_secret", this.changeSecret);

        this.listenTo(this.model, "change:title", this.documentScript);
        this.listenTo(this.model, "change:description", this.documentScript);
    },

    deferredInitialize: function () {
        this.listenTo(this.model, "change:categories", this.renderCategories);
        this.listenTo(this.model, "change:categories", this.renderUrlistsSuggestion);
        this.listenTo(this.model.get("urls"), "add remove", this.updateUrlsCounter);
        this.listenTo(this.model.get("urls"), "add", this.removePlaceholder);
        this.listenTo(this.model.get("contributors"), "add remove", this.documentScript);
        this.listenTo(this.model.get("followers"), "add remove", this.updateFollowersCounter);
        this.listenTo(this.model.get("sections"), "add remove", this.updateSectionsVisibility);
        this.listenTo(this.model.get("sections"), "add remove", this.updateAddSectionVisibility);
        this.listenTo(this.model, "destroy", function () { UL.Router.navigate("/dashboard", { trigger: true }); });
    },

    updateSectionsVisibility: function () {
        this.$(".list-page").toggleClass("list-show-sections", this.model.get("sections").length > 1);
    },

    updateAddSectionVisibility: function () {
        this.$(".js-add-section").toggleClass("hide",
            this.model.get("sections").length >= UL.config.sections_limit);
    },

    updateUrlsCounter: function () {
        this.$(".js-urls-counter").text(this.model.get("urls").length);
    },

    updateFollowersCounter: function () {
        var followersAmount = this.model.get("followers").length;

        this.$(".js-list-followers").toggleClass("hide", !followersAmount);
        this.$(".js-list-followers-counter").text(followersAmount);
    },

    removePlaceholder: function () {
        this.$(".js-empty-placeholder").remove();
    },

    followList: function (e) {
        if (ul.dialog.requireSignup()) return false;

        var hash = this.model.get("hash");
        this.toggleFollow(e);

        // XXX: must be refactored soon
        UL.EventOriginator.push(e.getSource());

        UL.Broker.push("follow-list", { list_hash: hash });

        // Throw a user friendly confirm message
        view.utils.displayAlert(ul.util.t("messages/bookmark_feedback")());
    },

    unfollowList: function (e) {
        var hash = this.model.get("hash");
        this.toggleFollow(e);

        // XXX: must be refactored soon
        UL.EventOriginator.push(e.getSource());

        UL.Broker.push("unfollow-list", { list_hash: hash });
    },

    reportCallback: function (e) {
        var reportView = new view.dialog.Report({
            model: this.model
        });

        reportView.render();
    },

    editCallback: function (e) {
        var dialog = new view.dialog.SettingsList({
            model: this.model,
            dialogClass: "dialog-settings",
            closeOnOverlay: true
        });

        dialog.render();
    },

    editContributorsCallback: function (e) {
        var dialog = new view.dialog.Contributors({
            model: this.model,
        });

        dialog.render();

        return false;
    },

    settingsListSections: function (e) {
        var dialog = new view.dialog.SettingsListSections({
            model: this.model,
            collection: this.model.get("sections"),
            dialogClass: "dialog-settings-list-section",
            closeOnOverlay: true
        });

        dialog.render();
    },

    suggestLink: function (e) {
        var dialog = new view.dialog.SuggestLink({
            model: this.model,
            dialogClass: "dialog--suggest-link",
        });

        dialog.render();
    },

    suggestedLinks: function (e) {
        var dialog = new view.dialog.SuggestedLinks({
            model: this.model,
            dialogClass: "dialog--suggested-links",
        });

        dialog.render();
    },

    addSection: function (e) {
        UL.Broker.push("add-section", { list_hash: this.model.get("hash") })
            .done( function () {
                $("html, body").animate({ scrollTop: $(document).height() }, "250");
            });
    },

    /**
     * Renderers
     */
    deferredAuthorRender: function () {
        var author = this.model.get("author"),
            template = ul.util.t("urlist/widget.author"),
            json = author.toJSON(),
            $html = template(json);

        this.$(".people .author").html($html);
    },

    renderSummary: function () {
        var summaryView = new view.urlist.Summary({
                el: this.$(".js-summary"),
                model: this.model
            });

        summaryView.render();
    },

    renderAuthor: function () {
        var author = this.model.get("author");
        if (author.has("screen_name")) {
            this.deferredAuthorRender();
        } else {
            this.listenTo(author, "change", this.deferredAuthorRender);
            author.fetch();
        }
    },

    renderCategories: function (model, value) {
        var template = ul.util.t("urlist/categories"),
            json     = { categories: this.model.getCategories() };

        this.$(".js-list_category-list").html(template(json));

        this.$(".js-categories-subheader").toggleClass("hide", !this.model.get("categories").length);
    },

    renderSections: function () {
        var sections = this.model.get("sections"),
            sectionsView = new view.urlist.Sections({
                el: this.$(".ui-urls-sections"),
                collection: sections,
                urlistView: this
            });

        sectionsView.render();
    },


    renderPeople: function () {
        var author = this.model.get("author"),
            contributors = this.model.get("contributors"),
            otherContributors = this.model.get("other_contributors"),
            peopleView = new view.urlist.People({
                el: this.$(".people"),
                model: author,
                urlist: this.model,
                collection: contributors,
                otherCollection: otherContributors
            });

        peopleView.render();
        this.listenTo(peopleView, "widgetReady", this.documentScript);
    },

    renderComments: function () {
        var comments = this.model.get("comments"),
            commentsView = new view.urlist.Comments({
                el          : this.$("#comment-area"),
                model       : this.model,
                collection  : comments
            });

        commentsView.render();
    },

    renderUrlistsSuggestion: function () {
        var urlistsView = new view.suggestion.Urlists({
                el   : this.$(".js-urlists-suggestion"),
                model: this.model
            });

        urlistsView.render();

        this.$(".js-popular-subheader").toggleClass("hide", this.model.get("categories").length > 0);

        this.listenTo(urlistsView, "widgetReady", this.documentScript);
    },

    deferredRenderList: function () {
        setDocumentTitle(this.model.get("title"));

        var json = this.model.toJSON({ calculated: true }),
            $html = this.template(json);

        this.deferredInitialize();

        this.$el.html($html);
        this.renderCategories();
        this.renderSummary();
        this.renderSections();
        this.renderPeople();
    },

    deferredRender: function () {
        console.info("[view.urlist]\t",
            "Render list", this.model.id);

        this.deferredRenderList();

        this.renderUrlistsSuggestion();

        this.documentScript();
        this.afterRender();
    },


    render: function () {
        this.model.whenReady()
            .done( _.bind(this.deferredRender, this) )
            .fail( function () { UL.Router.error404(); } );

        return this.$el;
    },

    changeTitle: function (model, value) {
        this.$(".js-list-title").text(value);
    },

    changeDescription: function (model, value) {
        this.$(".js-list-description").removeClass("hide").html(model.htmlDescription());
    },

    changeSecret: function (model, value) {
        this.$(".js-is-secret").toggle(value);
    },

    preventLink: function (e) {
        e.preventDefault();
    },

    toggleFollow: function (e) {
        e.preventDefault();

        this.$(".js-list-actions").toggleClass("is--done").addClass("is--triggered");
        this.$(".js-list-actions").one("mouseleave", function () { $(this).removeClass("is--triggered"); });
    },

    clearToggles: function() {
        this.$(".dropdown-menu, .dropup-menu").removeClass("opened");
    },

    afterRender: function () {
        if (!Modernizr.canvas) return;

        var that   = this,
            canvas = this.$el.find("#imageCanvas")[0],
            loader = this.$el.find("#coverUploader")[0],
            img    = new Image(),
            canvasImage;

        img.src = ""; // none by default

        this.canvasImage = new CanvasImage(canvas, loader, img);

        this.canvasImage.checkRatio = function (ratio) {
            if (ratio > 1.25) {
                console.log("Ratio is not so good", ratio);
                view.utils.displayAlert("Please choose an image that is at least 738px wide and 280px tall. " +
                                        "The cover image represents your list, pick some good quality image :)");
                that.hideNewCover.call(that);
                return false;
            } else {
                that.showNewCover.call(that);
                return true;
            }
        };

        $(".js-list-upload-cover").on("click", function(){
            $(".js-upload-cover_input").trigger("click");
            return false;
        });

        this.listenTo(this.model, "sync", function () { UL.Router.list(that.model, true); });
    },

    coverFileChange: function (e) {
        this._imgAuthor = null;
        this.showNewCover();
    },

    showNewCover: function (e) {
        //if ($(e.target).val() == "") return;

        this.canvasImage.bindToCanvas();

        $(".cover-instructions").show();

        $(".cover-container").fadeIn(250);
        $(".list-info .head").addClass("head--custom");
        $(".js-toggle--edit_cover").addClass("js-switch");
        $(".head-inner").toggleClass("reveal-cover_editor");
    },

    hideNewCover: function () {
        this.canvasImage.clear();
        $(".cover-container").fadeOut(250);
        $(".list-info .head").removeClass("head--custom");
        $(".js-toggle--edit_cover").removeClass("js-switch");
        $(".head-inner").toggleClass("reveal-cover_editor");
    },

    selectRemoteCover: function (img, author) {
        var that      = this,
            loader     = $(".cover-loader").fadeTo(250, 1),
            spinner   = new Spinner().spin(loader[0]);

        $(this.canvasImage.img).one("load", function () {
            spinner.stop();
            $(".cover-loader").fadeOut(0);
        });

        this._imgAuthor = author;

        this.canvasImage.setNewCover(img);
    },

    confirmNewCover: function () {
        var that       = this,
            encodedPNG = this.canvasImage.toDataURL(),
            loader     = $(".cover-loader").fadeTo(250, 0.6),
            spinner    = new Spinner().spin(loader[0]);

        $(".cover-instructions").hide();
        $(".js-toggle--edit_cover").hide();

        this.canvasImage.unbindToCanvas();
        console.log("hello, we are using the BASE64 representation of your image.",
                    "Unfortunately, support for canvas and image/jpeg is not yet",
                    "supported by all browsers, so it can take some time");

        $.ajax({
            url: "{0}list/{1}/cover-image".format(API_ROOT, this.model.get("hash")),
            type: "POST",
            data: { png_base64: encodedPNG },
            success: function (coverUrl) {

                UL.Broker.trigger("update-list-cover",
                    { list_hash: that.model.get("hash") },
                    { "cover_image": coverUrl });

                UL.Broker.push("update-list-cover-author",
                    { list_hash: that.model.get("hash") },
                    { "url_author": that._imgAuthor });

                $(".js-toggle--edit_cover").removeClass("js-switch");
                $(".head").addClass("head--custom");
                $(".js-head-cover").attr("src", "");
                $(".head-inner").toggleClass("reveal-cover_editor");
                $(".js-toggle--edit_cover").show();
                spinner.stop();
                loader.fadeOut(250);

                // Dismiss Cover Editor
                $(".cover-container").fadeOut(250);
                // Assign new cover on-the-fly
                $(".js-head-cover").attr("src", encodedPNG);
            }
        });

        return false;
    },

    removeCover: function () {

        var dialogDelete = new view.dialog.GenericDelete({ template: ul.util.t("dialog/delete_cover") });

        dialogDelete.render();

        this.listenTo(dialogDelete, "submit", function () {
            $.ajax({
                url: "{0}list/{1}/cover-image".format(API_ROOT, this.model.get("hash")),
                type: "DELETE" });

            $(".head-cover").attr("src","");
            $(".head--custom").removeClass("head--custom");
        });

        return false;
    },

    uploadImageByUrl: function (e) {
        var imageUrlView = new view.dialog.ImageUrlDialog();

        imageUrlView.render();
        this.listenTo(imageUrlView, "select-image", this.selectRemoteCover);
    },

    searchImageCallback: function (e) {
        var searchImageView = new view.dialog.SearchImage({
          parentView: this
        });

        searchImageView.render();
        this.listenTo(searchImageView, "select-image", this.selectRemoteCover);
    },

    shareList: function () {
        var dialog = new view.dialog.ShareList({
            model: this.model,
            closeOnOverlay: true
        });

        dialog.render();

        return false;
    },

    embedListDialog: function () {
        var dialog = new view.dialog.ShareList({
            model: this.model,
            closeOnOverlay: true,
            embed: true
        });
        dialog.render();
        return false;
    },

    selectForClipboard: function (e) {
        $(e.target).select();
    },

    showListFollowers: function () {
        var dialog = new view.dialog.ShowListFollowers({
            collection: this.model.get("followers"),
            dialogClass: "dialog-mini dialog-list-followers",
            title: "Bookmarked by",
            closeOnOverlay: true
        });

        dialog.render();
    },

    documentScript: function () {
        // Ensure that is not possible to see js-add-section if ont needed
        this.$(".js-add-section").toggleClass("hide",
            this.model.get("sections").length >= UL.config.sections_limit);

        var head = this.$(".head-inner").height(),
            desc = this.$(".list-description").outerHeight(),
            currHeight;

        $(".list-main-info").height(head - desc);

        currHeight = $(".list-main-info").height() + $(".list-description").height();
        if (currHeight > $(".head-inner").height())
            $(".head-inner").height(currHeight);

        // Clean the Header's old active states
        $(".js-app-navigation").children("li").removeClass("active");

        // Inject List Author (username) where required
        this.$(".js-author-username").text(this.model.get("author").get("username"));

        return;

        // If the user boots the app into a list, and has a section in their url then scroll down to that url
        // This is a super clever hack. When window.location.hash is set to something new, the scrolling is done instantly. So thanks to this, no fancy functions are needed, the browser does the work for us.
        var hash = window.location.hash;
        window.location.hash = "";
        window.location.hash = hash;

    }

});

