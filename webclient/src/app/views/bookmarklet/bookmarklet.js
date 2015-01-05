view.Bookmarklet = ul.bbext.View.extend({
    name: "view.Bookmarklet",

    events: {
        // Main events
        "click .js-url-save" : "submit",
        "click .js-cancel"   : "cancel",

        // Sharing events
        "click .js-share-twitter"  : "shareLinkOnTwitter",
        "click .js-share-facebook" : "shareLinkOnFacebook"
    },

    initialize: function () {
        this.selectedList    = null;
        this.selectedSection = null;
    },

    render: function () {
        var template        = ul.util.t("bookmarklet/bookmarklet"),
            json            = this.model.toJSON(),
            $html           = $(template(json)),
            listSelector    = new view.utils.ListSelector({ el: $html.find(".js-list-selector") });

        this.listenTo(listSelector, "update", this.updateSelector);
        listSelector.render();
        this.$el.html($html);

        // Be sure that the resize is queued
        // Get right window size, no matter what Bookmarklet version you have
        setTimeout(
            function(){
                var newHeight = window.outerHeight - window.innerHeight + 480;
                window.resizeTo(600, newHeight);
            }, 50
        );

        return this.$el;
    },

    saveLink: function () {
        var toListType      = this.selectedList.get("type"),
            toListSection   = this.selectedSection,

            target          = { list_hash: this.selectedList.get("hash") },

            payload         = _.purge({
                section         : toListSection,
                url             : this.model.get("url"),
                title           : this.$("input[name='title']").val(),
                description     : this.$("textarea[name='description']").val() });

        return UL.Broker.push("add-url", target, payload, { source: "bookmarklet" });
    },

    renderShare: function (error) {
        var template        = ul.util.t("bookmarklet/share"),
            json            = this.selectedList.toJSON(),
            $html           = $(template(json));

        $html = $(template(json));

        setTimeout(window.close, 4000);

        this.$el.html($html);
        return this.$el;
    },

    updateSelector: function (listModel, section) {
        this.selectedList    = listModel;
        this.selectedSection = section;
    },

    submit: function () {
        this.saveLink()
            .done( _.bind(this.renderShare, this) )
            .fail( _.bind(this.renderShare, this) );

        return false;
    },

    cancel: function () {
        window.close();
    },

    shareLinkOnTwitter: function () {
        twitterShare(this.selectedList.toTweet());
        UL.Broker.trigger("share-url", { list_hash: this.selectedList.get("hash") }, null, null, { channel: "twitter", source: "bookmarklet" } );
        return false;
    },

    shareLinkOnFacebook: function (e) {
        facebookShare(this.selectedList.fullUrl());
        UL.Broker.trigger("share-url", { list_hash: this.selectedList.get("hash") }, null, null, { channel: "facebook", source: "bookmarklet" } );
        return false;
    }

});

