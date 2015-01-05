view.dialog.RecoverPassword = Backbone.Dialog.extend({

    dialogClass: "dialog-password-recover",

    subrender: function () {
        var template = ul.util.t("dialog/recover_password"),
            json     = C.get("user").toJSON();

        return template(json);
    },

    success: function () {
        var template = ul.util.t("dialog/recover_password.success");

        this.$(".dialog-content").empty();
        this.$(".dialog-actions").remove();

        this.$(".dialog-content").append(template());
    },

    submit: function () {
        var email = this.$("input[name='email']").val();

        if(!view.utils.validateInput(this.$("input[name='email']")))
            return false;

        UL.Broker.push("recover-password", { email: email })
            .done(_.bind(this.success, this));

        return false;
    }

});

