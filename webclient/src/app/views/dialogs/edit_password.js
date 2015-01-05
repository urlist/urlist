view.dialog.EditPassword = Backbone.Dialog.extend({

    dialogClass: "dialog-password-edit",
    template   : ul.util.t("dialog/edit_password"),

    success: function () {
        view.utils.displayAlert("Password saved!", "confirm");
        this.unbindMe();
    },

    error: function (data) {
        this.$(".js-error-message[data-error='wrong-password']").removeClass("hide");
    },

    submit: function () {
        var payload = {
            old_password: this.$("input[name='old_password']").val(),
            new_password: this.$("input[name='new_password']").val()
        };

        this.$(".js-error-message").addClass("hide");

        if (payload.new_password.length < 5) {
            this.$(".js-error-message[data-error='too-short']").removeClass("hide");
            return false;
        }

        if (payload.new_password != this.$("input[name='confirm_password']").val()) {
            this.$(".js-error-message[data-error='not-match']").removeClass("hide");
            return false;
        }

        UL.Broker.push("change-password", {}, payload)
            .done(_.bind(this.success, this))
            .fail(_.bind(this.error, this));

        return false;
    }

});

