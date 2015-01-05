view.dialog.SettingsList = Backbone.Dialog.extend({

    subevents: {
        "click .js-delete-list"       : "deleteListCallback",
        "click .js-edit-contributors" : "editContributorsCallback",
        "click .js-edit-categories"   : "editCategories"

        // Useful for editing the Custom Link
        // "keypress .js-generated-value" : "showGeneratedValue",
        // "focus .js-show--generated-value" : "selectGeneratedValue"
    },

    dialogClass: "settings-list",

    subinitialize: function () {
        this.listenTo(this.model, "destroy", this.unbindAll);
        this.listenTo(this.model, "change:categories", this.changeCategories);
    },

    subrender: function () {
        var json = this.model.toJSON({calculated: true}),
            template = ul.util.t("dialog/settings_list"),
            secret_lists_left = C.get("user").get("secret_lists_left"),

            $html = $(template(_.extend(json, { secret_lists_left: secret_lists_left })));

        return $html;
    },

    editContributorsCallback: function (e) {
        var dialog = new view.dialog.Contributors({
                model: this.model
            });

        dialog.render();

        return false;
    },

    editCategories: function (e) {
        var dialog = new view.dialog.SelectCategory({
                model: this.model
            });

        dialog.render();

        return false;
    },

    changeCategories: function (model, value) {
        this.$(".js-label-categories").text(this.model.getCategories());
        this.$(".js-category-add").addClass("hide");
        this.$(".js-category-change").removeClass("hide");
    },

    deleteListCallback: function (e) {
        var dialog = new view.dialog.DeleteList({
                model: this.model,
                closeOnOverlay: true
            });

        dialog.render();

        return false;
    },

    submit: function () {
        var target = {
               list_hash: this.model.get("hash")
            },

            payload = _.purge({
                title      : this.$("input[name='title']").val(),
                slug       : this.$("input[name='generated-value']").val(),
                description: this.$("textarea[name='description']").val(),
            });

        if (this.model.get("is_secret"))
            payload.is_secret = !this.$("input[name='secret']").is(":checked");

        UL.Broker.push("update-list", target, payload);
    }

});

