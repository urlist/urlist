view.dialog.ShowListFollowers = Backbone.Dialog.extend({

    subevents: {
    },

    dialogClass: "dialog-mini dialog-list-followers",

    renderFollower: function ($html, modelFollower) {
        var template = ul.util.t("dialog/show_list_followers.item");

        modelFollower.whenReady().done(function () {
            $html.find(".js-followers").append(
                template(modelFollower.toJSON())
            );
        });
    },

    subrender: function () {
        var that = this,
            template = ul.util.t("dialog/show_list_followers"),
            $html = $(template({ title: this.options.title }));

        this.collection.each(function (modelFollower) {
            this.renderFollower($html, modelFollower);
        }, this);

        return $html;
    },

    submit: function () {}

});

