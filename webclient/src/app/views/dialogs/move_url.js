view.dialog.MoveUrl = Backbone.Dialog.extend({
    dialogClass: "move-url",
    template   : ul.util.t("dialog/move_url"),

    subinitialize: function () {
        this.selectedList = null;
        this.selectedSection = null;
    },

    subrender: function () {
        var json           = this.model.toJSON();
        var $html          = $(this.template(json));
        var listSelector   = new view.utils.ListSelector({
            el: $html.find(".js-list-selector")
        });

        this.listenTo(listSelector, "update", this.updateSelector);
        listSelector.render();

        return $html;
    },

    // This method is fired everytime the user selects a new target in their
    // dialog window.
    updateSelector: function (listModel, section) {
        this.selectedList = listModel;
        this.selectedSection = section;
    },

    submit: function () {
        var fromListHash = this.model.getUrlist().get("hash");
        var fromUrlHash = this.model.get("hash");
        var toListSection = this.selectedSection;
        var toListHash = this.selectedList.get("hash");
        var that = this;

        if (fromListHash === toListHash) {
            UL.Broker.push("move-url", {
                list_hash: toListHash,
                url_hash: fromUrlHash,
                section: toListSection
            }, {})
                .done(function () {
                    view.utils.displayAlert("Link is moved. All is good.");
                    // Update the DOM accordingly
                    // Note how this is on the document level
                    var movedLink = $("[data-hash='{0}']".format(fromUrlHash));
                    $("[data-section_id='{0}']".format(toListSection)).prepend(movedLink);
                })
                .fail(function () {
                    view.utils.displayAlert("Whoops! Something went wrong. Try again?");
                });
        } else {
            var target = {
                from_list: { list_hash: fromListHash, url_hash: fromUrlHash },
                to_list: { list_hash: toListHash, section: toListSection }
            };
            UL.Broker.push("move-url-to-another-list", target, {})
                .done(function () {
                    view.utils.displayAlert("The link is moved. <a href='/{0}' class='js-navigate' >Go there</a>".format(toListHash));
                })
                .fail(function (data) {
                    // if link already in destination, show that error
                    if (data === "UrlExists") {
                        view.utils.displayAlert("That link is already there. No need to worry :)");
                    } else {
                        view.utils.displayAlert("Oh gosh. Something went wrong. We are super sorry");
                    }
                });
        };
    }
});
