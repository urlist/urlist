view.dialog.DeleteList = Backbone.Dialog.extend({

    dialogClass: "remove-list",
    template   : ul.util.t("dialog/delete_list"),

    submit: function () {
        var list = this.model,
            user = C.get("user");

        UL.Broker.push("remove-list", { list_hash: list.get("hash") });
    }

});
