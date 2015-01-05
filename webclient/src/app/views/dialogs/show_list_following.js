view.dialog.ShowListFollowing = Backbone.Dialog.extend({
    subevent: {
    },

    // dialogClass: "dialog-mini dialog-list-following", //This should not be needed

    renderFollowing: function ($html, modelFollowing) {
        var template = ul.util.t("dialog/show_list_following.item");

        modelFollowing.whenReady().done( function () {
            $html.find(".js-following").append(
                template( modelFollowing.toJSON() )
            );
        });
    },

    subrender: function () {
        var that = this;
        var template = ul.util.t("dialog/show_list_following");
        var $html = $(template(
            { title: this.options.title }
        ));

        this.collection.each(function (modelFollowing) {
            this.renderFollowing( $html, modelFollowing )
        }, this)

        return $html;
    },

    submit: function () {}

})
