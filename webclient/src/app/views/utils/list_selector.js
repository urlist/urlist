view.utils.ListSelector = ul.bbext.View.extend({
    events: {
        "focus .js-input-relist-to": "openSelect",
        "click .js-relist-item-new": "openSelect",
        "click .js-relister-trigger": "focusSelect",
        "click .js-start-new-list" : "newListCallback",
        "change .js-sub-section select": "changeSection"
    },

    initialize: function () {
        var that = this;

        this.selectedList    = null;
        this.selectedSection = null;
        this.listenTo(C.get("user").get("lists"), "add remove", function () {
            that.parseSource();
            that.changeList(that.firstToLoad);
        });
        this.parseSource();
    },

    render: function () {
        var template = ul.util.t("utils/list_selector");
        this.$el.html(template());
        this.renderAutocomplete();
        this.changeList(this.firstToLoad);
        return this.$el;
    },

    renderSummary: function (urlistModel) {
        var template    = ul.util.t("utils/list_selector.summary"),
            data;

        this.$(".js-sub-section").empty();

        data = urlistModel.get("sections").toJSON();
        if (data.length > 1)
            this.$(".js-sub-section").html( template({ sections: data }) );

        this.$("select").niceSelect();
        // this.$("select").css("border","2px solid red");

        this.trigger("update", this.selectedList, this.getSelectedSection());
    },

    changeSection: function () {
        this.trigger("update", this.selectedList, this.getSelectedSection());
    },

    changeList: function (item) {
        if (!item) return;

        var hash        = item.value,
            title       = item.label,
            secretHtml  = item.is_secret ? " <i class='icon-private small'></i> " : "",
            urlistModel = new ul.model.Urlist({ hash: hash });

        this.$(".list-details").remove();
        this.$(".js-input-relist-to").val(title);
        this.$(".js-input-relist-to").before("<h5 class='list-details'>" + secretHtml + "</h5>");
        this.$(".js-input-relist-to").blur();

        this.selectedList = urlistModel;

        urlistModel.whenReady().done(_.bind(this.renderSummary, this, urlistModel));
    },

    getSelectedSection: function () {
        var val = this.$("select").val();

        return val ? parseInt(val) : null;
    },

    newListCallback: function (e) {
        var dialog = new view.dialog.NewList({
                model: C.get("user"),
                closeOnOverlay: true,
                sourceEvent: e
            });

        dialog.render();

        dialog.on("close", this.renderAutocomplete, this);
        return false;
    },

    focusSelect: function () {
        // this.openSelect();
        this.$(".js-input-relist-to").select();
        return false;
    },

    openSelect: function () {
        this.$(".js-input-relist-to").autocomplete("search", "");
    },

    retrieveSource: function (request, response) {
        response($.ui.autocomplete.filter(this.source, request.term));
    },

    parseSource: function () {
        var lists  = C.get("user").get("lists"),
            first  = lists.first(),
            source = lists.map(function (urlistModel) {
            return {
                label       : urlistModel.get("title"),
                value       : urlistModel.get("hash"),
                is_secret   : urlistModel.get("is_secret"),
                index       : urlistModel.get("links_amount")
            };
        });

        this.source = source;
        if (first)
            this.firstToLoad = {
                    label       : first.get("title"),
                    value       : first.get("hash"),
                    is_secret   : first.get("is_secret"),
                    index       : first.get("links_amount")
                };
    },

    renderAutocomplete: function () {
        var that = this;

        this.$(".js-input-relist-to").autocomplete({

            minLength: 0,
            source: _.bind(this.retrieveSource, this),

            create: function() {

                $(".section-relist").append("<div class='ui-autocomplete-container'></div>");
                $(".ui-autocomplete-container").append("<a class='clearfix relist-item-new hide js-relist-item-new' href='#'>Create new List</a>");

            },

            open: function(event, ui) {

                $("ul.ui-autocomplete")
                    .removeAttr("style")
                    .css({
                        "z-index"  : "999999",
                        "position" : "absolute",
                        "max-height" : "auto",
                        "box-shadow" : "none"
                    })
                    .appendTo(".section-relist")
                    .fadeIn(100);
            },

            close: function(event, ui) {

                $(".js-relist-item-new").addClass("hide");

            },

            focus: function(event, ui) {
                event.preventDefault();
            },

            select: function(event, ui) {
                that.changeList.call(that, ui.item);
                event.preventDefault(); // Prevent "confirm" action (2nd key stroke)
            }

        }).data("uiAutocomplete")._renderItem = function(ul, item) {

            var itemIndex  = (item.index)     ? " <q class='notation'>{0} links</q> ".format(item.index) : "",
                itemSecret = (item.is_secret) ? " <i class='icon-private small'></i> " : "",
                itemTmpl = "<a>" + item.label + itemIndex + itemSecret + "</a>";

            return $("<li class='clearfix relist-item'></li>")
                .data("item.autocomplete", item).append(itemTmpl).appendTo(ul);
        };

    }

});

