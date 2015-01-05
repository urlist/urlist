view.dialog.ImageUrlDialog = Backbone.Dialog.extend({

    subrender: function () {
        var template = ul.util.t("dialog/image_url_dialog"),
            $html = $(template());

        return $html;
    },

    submit: function () {
        var val    = this.$(".js-url-input").val();
            tunnel = API_ROOT + "redirect?url=" + val;

        if (val)
            this.trigger("select-image", tunnel, val);

    }
});
