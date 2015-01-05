view.dialog.EditUrl = Backbone.Dialog.extend({

    dialogClass: "edit-url",
    template   : ul.util.t("dialog/edit_url"),

    subevents: {
        "click .js-delete-url": "deleteUrlCallback"
    },

    subinitialize: function () {
        this.listenTo(this.model, "destroy", this.unbindAll);
    },

    deleteUrlCallback: function (e) {
        var dialog = new view.dialog.DeleteUrl({
                model: this.model,
                closeOnOverlay: true
            });

        dialog.render();

        return false;
    },

    submit: function () {
        var target = {
                list_hash   : this.model.getUrlist().get("hash"),
                url_hash    : this.model.get("hash")
            },

            payload = _.purge({
                title       : this.$("input[name='title']").val(),
                description : this.$("textarea[name='description']").val()
            });

        UL.Broker.push("update-url", target, payload);
    }


});

