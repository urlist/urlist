view.urlist.Section = ul.bbext.View.extend({

    events: {
        "submit .ui-sub-add-url": "addUrlUI",
        "click .ui-load-more": "loadMore"
    },

    initialize: function () {
        this.urlist = this.model.urlist;

        this.template = ul.util.t("urlist/section");

        this.listenTo(this.model, "change:title", this.changeTitle);

        this.listenTo(this.urlist.get("urls"), "add remove move", this.updateUrlsCounter);
        this.listenTo(this.urlist.get("urls"), "add remove move", this.updatePlaceholder);
        this.listenTo(this.urlist.get("urls"), "add", this.addUrl);
        this.listenTo(this.model, "destroy", this.destroy);
        this.listenTo(this.urlist.get("urls"), "remove", this.removeLink);
    },

    removeLink: function (model) {
        this.$("[data-cid='{0}']".format(model.cid)).fadeOut();
    },

    addUrl: function (model) {
        var index = model.get("section");

        if (index == this.model.id)
            this.prependUrl(model);
    },

    _addUrlUI: function (url, suppressErrors) {
        var hash    = this.options.urlistView.model.get("hash"),
            section = this.model.id;

        url = normalizeUrl(url);

        if (!suppressErrors && this.urlist.hasUrl(url)) {
            view.utils.displayAlert("Ops! you already added that link", "error");
            return false;
        }

        UL.Broker.push("add-url", { list_hash: hash }, { url: url, section: section })
            .fail(function () {
                if (!suppressErrors)
                    view.utils.displayAlert("Something went wrong! Are you sure it was a link? Try again", "error");
            });
    },

    addUrlUI: function (e) {
        var that  = this;
        that.urls = this.$(".ui-add-link-txt").val().split(" ");

        this.$(".ui-add-link-txt").val("");

        function doTimeoutForAdd (link, timeout) {
            // This function together with the loop following it allows users to add many urls at once. Because Jesus did this and crashed urlist with their divine api calls, nay, api _commandment_. 
            // Using `_.bind` allow us to keep the context of
            // `this`, otherwise the `_addUrlUI` is totally broken

            var f = _.bind(that._addUrlUI, that, link, that.urls.length);
            setTimeout(f, timeout);
        }

        for (var i = 0; i < that.urls.length; i++) {
            if (that.urls[i].indexOf(".") != -1) {
                doTimeoutForAdd(that.urls[i], i * 1000);
            }
        }

        this.$(".js-empty-placeholder").remove();
        return false;
    },

    removeUrl: function (url) {
        this.$(".ui-urls .url[data-cid='{0}']".format(url.cid)).remove();
    },

    prependUrl: function (url) {
        var urlView = new view.urlist.Url({ model: url }),
            $html   = urlView.render();

        this.$(".ui-urls").prepend($html);

        //urlView.render().prependTo(this.$(".ui-urls")).hide().slideDown("slow");
    },

    appendUrl: function (url) {
        var urlView = new view.urlist.Url({ model: url });
        this.$(".ui-urls").append(urlView.render());
    },

    changeTitle: function (model) {
        this.$el.attr("id", model.getTitleSlug());
        this.$(".js-section-title").text(model.get("title") || model.get("empty_title"));
    },

    renderLoadMore: function (left) {
        var template = ul.util.t("urlist/section.loadmore");
        this.$(".ui-urls-section").append( template({ left: left }) );
    },

    renderUrlsSlice: function () {
        var urls = this.model.getLocalUrls(),
            rendered = this.$(".js-url-item").length,
            amount = 50,
            left = urls.length - rendered - amount;

        if (left > 0 && left < 5) {
            amount += left;
            left = 0;
        }

        for (var i = rendered; i < rendered + amount && i < urls.length; i++)
            this.appendUrl(urls[i]);

        if (!urls.length)
            this.$(".ui-urls").append(ul.util.t("urlist/empty_section"));

        this.$(".ui-load-more").remove();
        if (left > 0)
            this.renderLoadMore(left);

        this.$(".ui-urls-section").toggleClass("show-bottom-border", left <= 0);

    },

    render: function () {
        var json = this.model.toJSON({ calculated: true });

        json.policies = this.model.urlist.getPolicies();
        json.urls_amount = this.model.getLocalUrls().length;
        json.total_urls_amount = this.model.urls.length;

        this.$el.html( this.template( json ) );
        this.renderUrlsSlice();
        this.bindDrag();

        return this.$el;
    },

    loadMore: function () {
        this.renderUrlsSlice();
        return false;
    },

    updateUrlsCounter: function () {
        this.$(".js-section-link-amount").text(this.model.getUrlsAmount());
    },

    updatePlaceholder: function () {
        if (!this.model.getLocalUrls().length)
            this.$(".ui-urls").append(ul.util.t("urlist/empty_section"));
    },

    updateUrlPosition: function (e, ui) {
        var prevItem    = ui.item.prev(),
            nextItem    = ui.item.next(),

            prevCid     = prevItem.attr("data-cid"),
            nextCid     = nextItem.attr("data-cid"),

            urls        = this.urlist.get("urls"),
            thisModel   = urls.get(ui.item.attr("data-cid")),
            prevModel   = urls.get(prevCid),
            nextModel   = urls.get(nextCid),

            direction   = ui.position.top - ui.originalPosition.top,

            position, section;


        // Moving up
        if (direction < 0) {
            if (prevModel) {
                position = prevModel.get("position") + 1;
                section = prevModel.get("section");
            } else if (nextModel) {
                position = nextModel.get("position");
                section = nextModel.get("section");
            } else {
                position = this.urlist.lastPositionForSection(this.model.get("position")) + 1;
                section = this.model.id;
            }
        // Moving down
        } else {
            if (prevModel) {
                position = prevModel.get("position");
                section = prevModel.get("section");
            } else if (nextModel) {
                position = nextModel.get("position") - 1;
                section = nextModel.get("section");
            } else {
                position = this.urlist.lastPositionForSection(this.model.get("position"));
                section = this.model.id;
            }
        }

        UL.Broker.push("move-url", {
                list_hash: this.urlist.get("hash"),
                url_hash: thisModel.get("hash")
            }, {
                position: position,
                section: section
            });
    },

    bindDrag: function () {
        // with some help from: http://stackoverflow.com/a/8896191/597097
        var that = this;

        if ( !policies.urlist["sort_list"](C.get("user"), this.urlist) )
            return;

        this.$(".ui-urls").sortable({
            handle: ".ui-drag-handle",
            placeholder: "ui-state-highlight",
            helper: "clone",
            opacity: 0.8,
            connectWith: ".ui-urls",

            //placeholder: "sortable-placeholder",
            //axis: "y",

            start: function( event, ui ) {
                $("<div/>", { "class" : "ui-state-highlight-content" }).appendTo(".ui-state-highlight");
            },

            update: function (e, ui) {
                // If dragging from one section to another, update is triggered
                // two times. We have to check if we have or not the new
                // ui.item, to call `updateUrlPosition` only on the section
                // that is *receiving* the item.

                var isMyBusiness = that.$(".ui-urls").has(ui.item).length > 0;

                if (isMyBusiness)
                    that.updateUrlPosition(e, ui);
            }

        });
    },

    destroy: function() {
        this.unbindMe();
    }

});

