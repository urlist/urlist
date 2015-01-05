view.dialog.DeleteContributor = Backbone.Dialog.extend({

    dialogClass: "remove-contributor",
    template:    ul.util.t("dialog/delete_contributor"),

    submit: function () {
        UL.Broker.push(
            "remove-contributor",
            { list_hash: this.options.urlistModel.get("hash") },
            { user_id: this.model.id });
    }

});
