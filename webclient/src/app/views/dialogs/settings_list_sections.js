view.dialog.SettingsListSections = Backbone.Dialog.extend({

    subevents: {
        "click .js-add-section": "newSection",
        "click .js-delete-section": "deleteSection"
    },

    dialogClass: "settings-list-sections",

    subinitialize: function () {
        this.settingsTemplate = ul.util.t("dialog/settings_list_sections");
        this.settingsItemTemplate = ul.util.t("dialog/settings_list_sections.item");
        this.listenTo(this.collection, "remove", this.removeSection);
        this.listenTo(this.collection, "add", this.addSection);

        this.listenTo(this.collection, "add remove", this.updateAddSectionVisibility);
        this.listenTo(this.collection, "add remove", this.updateSectionsLeft);
    },

    subrender: function () {
        var that = this,
            json = { sections: [] },
            $html = $(this.settingsTemplate({ sections_left: this.collection.getSectionsLeft() })),
            $ul = $html.find(".js-reference-sections");

        $ul.empty();

        this.collection.forEach( function (u) {
            $ul.append(that.settingsItemTemplate(u.toJSON({ calculated: true })));
        });

        $ul.sortable({
                axis  : "y",
                handle: ".label-section",
                helper: "clone",
                start : function () { $ul.addClass("sorting"); that.movedSections = true; },
                stop  : function () { $ul.removeClass("sorting"); }
            });

        return $html;
    },

    updateAddSectionVisibility: function () {
        this.$(".js-add-section").toggleClass("hide", !this.collection.getSectionsLeft());
    },

    updateSectionsLeft: function () {
        this.$(".js-counter-sections-left").text(this.collection.getSectionsLeft());
    },

    removeSection: function (m) {
        this.$(".js-section-item[data-cid='{0}']".format(m.cid))
            .slideUp("slow")
            .fadeOut("slow", function () {
                $(this).remove();
            });
    },

    newSection: function (e) {
        UL.Broker.push("add-section", { list_hash: this.model.get("hash") });
    },

    addSection: function (sectionModel) {
        var $ul = this.$(".js-reference-sections"),
            $elem;

        $elem = $(this.settingsItemTemplate(sectionModel.toJSON({ calculated: true })));
        $elem.appendTo($ul).hide().slideDown("slow");

        if ($ul.find("input").length > UL.config.sections_limit) {
            this.$(".js-add-section").addClass("inactive");
        }

        return false;
    },

    deleteSection: function (e) {
        var $ul        = this.$(".js-reference-sections"),
            $this      = $(e.target),
            list_hash  = this.model.get("hash"),
            cid        = $this.closest(".js-section-item").attr("data-cid"),
            id         = this.collection.get(cid).id;
            dialogView = new view.dialog.GenericDelete({
                template: ul.util.t("dialog/delete_section"),
                submit: function (e) {
                    // XXX: may not be an Int in the future
                    UL.Broker.push("remove-section",
                        { list_hash: list_hash, section_id: parseInt(id) });
                }
            });

        dialogView.render();

        return false;
    },

    submit: function () {
        var that = this,
            $inputs = this.$(".js-reference-sections input"),
            data = [];

        $inputs.each(function () {
            var $this = $(this),
                cid   = $this.closest(".js-section-item").attr("data-cid"),
                id    = that.collection.get(cid).id,
                title = $.trim($this.val());

            // XXX: may not be an Int in the future
            data.push({ section_id: parseInt(id), title: title });
        });

        UL.Broker.push("update-sections",
            { list_hash: this.model.get("hash") },
            { sections: data })
        .done(function () {
            if (that.movedSections) that.model.fetch();
        });

    }

});

