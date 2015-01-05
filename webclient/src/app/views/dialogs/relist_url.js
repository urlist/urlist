view.dialog.RelistUrl = Backbone.Dialog.extend({
    dialogClass: "relist-url",

    subinitialize: function () {
        this.selectedList    = null;
        this.selectedSection = null;
    },

    subrender: function () {
        var json        = this.model.toJSON(),
            template    = ul.util.t("dialog/relist_url"),
            $html       = $(template(json)),
            listSelector= new view.utils.ListSelector({ el: $html.find(".js-list-selector") });

        this.listenTo(listSelector, "update", this.updateSelector);
        listSelector.render();

        return $html;
    },

    updateSelector: function (listModel, section) {
        this.selectedList = listModel;
        this.selectedSection = section;
    },

    submit: function () {
        var that = this;
        // If there is a from_list_hash already in the model, then reuse that.
        var from_list_hash = this.model.get("from_list_hash");
        var from_url_hash  = this.model.get("from_url_hash");

        // This checks whether our relist is >= second generation relist. 
        // If so, then keep the original from-data.
        // This is so that we can link back to the source of a relist, even
        // if the link has been relisted multiple times.
        if (!from_list_hash) {
            from_list_hash = this.model.get("list_hash");
            // Should this be url_hash or simply hash???
            from_url_hash  = this.model.get("hash");
        }

        var toListSection   = this.selectedSection;

        var target          = { list_hash: this.selectedList.get("hash") };

        var payload         = _.purge({
                section         : toListSection,
                url             : this.model.get("url"),
                title           : this.$("input[name='title']").val(),
                description     : this.$("input[name='description']").val(),
                embed_handler   : this.model.get("embed_handler"),
                from_list_hash  : from_list_hash,
                from_url_hash   : from_url_hash
            });

        // XXX: must be refactored soon
        UL.EventOriginator.push(this.getSource());

        UL.Broker.push("relist-url", target, payload)
            .done( _.bind(this.success, this) )
            .fail( function () {
                that.unbindAll();
                view.utils.displayAlert("Ouch, there was error, please give it another try.");
            });

        return false;
    },

    success: function () {
        var template = ul.util.t("dialog/relist_url.success");

        this.$(".dialog-content").empty();
        this.$(".dialog-actions").remove();

        // XXX: REMOVE MEEEEE!!1!!11one1!!eleven
        this.selectedList.superOld();

        this.$(".dialog-content").append(template(this.selectedList.toJSON()));
    }

});

