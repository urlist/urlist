view.dialog.NewList = Backbone.Dialog.extend({
    dialogClass: "new-list narrower",

    subevents: {
        "keyup input[name='title']": "validateInput"
    },

    subinitialize: function () {
        this.model = this.model || C.get("user");
    },

    subrender: function () {
        var template = ul.util.t("dialog/new_list"),
            json = this.model.toJSON({ calculated: true });

        return template(json);
    },

    validateInput: function (e) {
        view.utils.validateInput( $(e.target) );
    },

    submit: function () {
        var target = { },

            payload = _.purge({
                title       : this.$("input[name='title']").val(),
                description : this.$("textarea[name='description']").val(),
                is_secret   : this.$("input[name='secret']:checked").val() == "true"
            });

        if (!view.utils.validateInput( this.$("input[name='title']") ))
            return false;

        // XXX: must be refactored soon
        UL.EventOriginator.push(this.getSource());

        UL.Broker.push("add-list", target, payload, { gotoList: this.options.gotoList });
    }

});

