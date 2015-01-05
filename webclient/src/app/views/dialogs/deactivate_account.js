view.dialog.DeactivateAccount = Backbone.Dialog.extend({

    dialogClass: "dialog-deactivate-account",

    subrender: function () {
        var json = this.model.toJSON(),
        // var json = C.get("user");
            template = ul.util.t("dialog/deactivate_account");

        return template(json);
    },

    submit: function () {}

});

