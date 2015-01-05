view.dialog.AddPassword = Backbone.Dialog.extend({

    dialogClass: "dialog-password-add",

    subrender: function () {
        var json = this.model.toJSON(),
        // var json = C.get("user");
            template = ul.util.t("dialog/add_password");

        return template(json);
    },

    submit: function () {}

});

