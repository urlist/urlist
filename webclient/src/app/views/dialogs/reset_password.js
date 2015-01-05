view.dialog.ResetPassword = Backbone.Dialog.extend({

    dialogClass: "dialog-password-reset",
    template   : ul.util.t("dialog/reset_password"),

    submit: function () {
        var payload = {
            password    : this.$("input[name='new_password']").val(),
            recover_code: this.options.recoverCode
        };

        this.$(".js-error-message").addClass("hide");

        if (payload.password.length < 5) {
            this.$(".js-error-message[data-error='too-short']").removeClass("hide");
            return false;
        }

        if (payload.password != this.$("input[name='confirm_password']").val()) {
            this.$(".js-error-message[data-error='not-match']").removeClass("hide");
            return false;
        }

        UL.Broker.push("reset-password", {}, payload)
            .done(function () {
                //view.utils.displayAlert("Password saved!", "confirm");
                window.location = "/";
            })
            .fail(function () {
                view.utils.displayAlert("Ouch, something went wrong, try again :(", "error");
            });
    }

});

