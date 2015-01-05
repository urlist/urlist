view.dialog.Report = Backbone.Dialog.extend({

    dialogClass: "report",
    template   : ul.util.t("dialog/report"),

    submit: function () {
        var payload = _.purge({
            email     : this.$("input[name='email']").val(),
            message   : this.$("textarea[name='message']").val(),
            user_agent: window.navigator.userAgent
        });

        UL.Broker.push("report-list", { list_hash: this.model.get("hash") }, payload)
            .done( function () { view.utils.displayAlert("Report submitted"); } );
    }

});

