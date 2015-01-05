view.dialog.DeleteUrl = Backbone.Dialog.extend({

    dialogClass: "remove-url",
    template   : ul.util.t("dialog/delete_url"),

    submit: function () {
        var list_hash = this.model.collection.urlist.get("hash"),
            url_hash = this.model.get("hash");

        UL.Broker.push("remove-url", { list_hash: list_hash, url_hash: url_hash }, { });
    }

});
