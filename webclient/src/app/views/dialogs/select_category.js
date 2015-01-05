view.dialog.SelectCategory = Backbone.Dialog.extend({

    dialogClass: "dialog--select_category",

    subevents: {
        "click input[name='category']": "updateCategory"
    },

    subinitialize: function () {
    },

    subrender: function () {
        var template = ul.util.t("dialog/select_category"),
            json = this.model.toJSON({ calculated: true });

        json.all_categories = UL.ORDERED_CATEGORIES;
        return template(json);
    },

    updateCategory: function (e) {
        var $check = $(e.target),
            checkedLength = this.$("input[name='category']:checked").length;

        if (checkedLength > 0) {
            this.$("input[type='submit']").removeAttr("disabled");
            this.$("input[type='submit']").removeClass("inactive");
        } else {
            this.$("input[type='submit']").attr("disabled", "disabled");
            this.$("input[type='submit']").addClass("inactive");
        }

        if (checkedLength > 2)
            return false;
    },

    validateInput: function (e) {
        view.utils.validateInput( $(e.target) );
    },

    submit: function () {
        var target = { list_hash: this.model.get("hash") },

            payload = {
                categories: _.map(this.$("input[name='category']:checked"),
                                    function (e) { return $(e).val() })
            };

        // XXX: must be refactored soon
        UL.EventOriginator.push(this.getSource());
        
        UL.Broker.push("update-categories", target, payload);
    }

});

