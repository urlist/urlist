view.dialog.SuggestLink = Backbone.Dialog.extend({

    dialogClass: "suggest-link",

    template   : ul.util.t("dialog/suggest_link"),

    subevents: {},

    subinitialize: function () {},

    subrender: function () {
        var json     = this.model.toJSON();
        var sections = this.model.get("sections").toJSON();

        json.sections = sections.length > 1 ? sections : null;
        json.suggested_url = $.cookie("ul.suggest.url");
        json.suggested_description = $.cookie("ul.suggest.description");

        var $html = $(this.template(json));

        return $html;
    },

    documentScript: function () {
        // Apply niceSelect
        this.$("select").niceSelect();
    },

    manageAnon: function () {
        var listHash    = this.model.get("hash"),
            url         = normalizeUrl(this.$("input[name='url']").val()),
            description = this.$("textarea[name='description']").val(),
            sectionId   = this.$("select[name='section_id']").val();

        ul.dialog.signupContinue();

        $.cookie("_ul_suggest_list_hash", listHash, { expires: 1 });
        $.cookie("_ul_suggest_url", url, { expires: 1 });
        $.cookie("_ul_suggest_description", description, { expires: 1 });
        $.cookie("_ul_suggest_section_id", sectionId, { expires: 1 });
    },

    suggestUrl: function () {
        var that = this,

            target = {
                list_hash: this.model.get("hash")
            },

            payload = {
                url        : normalizeUrl(this.$("input[name='url']").val()),
                description: this.$("textarea[name='description']").val(),
                section_id : this.$("select[name='section_id']").val()
            };


        this.toggleActions(false);

        return UL.Broker.push("suggest-url", target, payload)
            .done( _.bind(this.success, this) )
            .fail( function () {
                that.toggleActions(true);
                view.utils.displayAlert("Ouch, there was error, are you sure it was a link?");
            });
    },

    submit: function () {
        if (C.get("user").isAnonymous()) {
            this.manageAnon();
            return false;
        }

        var that = this,
            a = view.utils.validateInput(this.$("input[name='url']"));

        if (!a) {
            this.$(".error-message").removeClass("hide");
            return false;
        }

        this.suggestUrl();

        return false;
    },

    success: function () {
        var template = ul.util.t("dialog/suggest_link.success");

        this.$(".dialog-content").empty();
        this.$(".dialog-actions").remove();

        this.$(".dialog-content").append(template(this.model.toJSON()));
    }

});

