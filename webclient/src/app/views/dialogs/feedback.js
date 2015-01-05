view.dialog.Feedback = Backbone.Dialog.extend({

    template   : ul.util.t("dialog/feedback"),

    submit: function () {
        var payload = _.purge({
            email     : this.$("input[name='email']").val(),
            message   : this.$("textarea[name='message']").val(),
            referral  : window.location.href,
            user_agent: window.navigator.userAgent
        });

        $(".js-feedback-status").find(".js-toggle-one").addClass("hide");
        $(".js-feedback-status").find(".js-toggle-two").removeClass("hide");

        UL.Broker.push("new-feedback", {}, payload);
    }

});

