view.urlist.SummaryItem = ul.bbext.View.extend({

    tagName: "li",

    initialize: function () {
        this.urlistModel = this.options.urlistModel;

        this.template = ul.util.t("urlist/summary.item");

        this.listenTo(this.urlistModel.get("urls"), "add remove move", this.render);
        this.listenTo(this.model, "change", this.render);
        this.listenTo(this.model, "destroy", this.destroy);
    },

    render: function () {
        var json = this.model.toJSON({ calculated: true }),
            html = this.template(json);

        this.$el.html(html);

        var a = this.model;

        // Users visiting a list should not see empty sections. 
        // If the current list is not mine and is empty, then don't render it.
        // If it is mine, show it anyways.
        if (!this.model.urlist.isMine() ){
            if (this.model.calculatedAttributes.urls_amount() > 0){
                return this.$el;
            } else {
                return false;
            }
        } else {
            return this.$el;
        }
    },

    destroy: function() {
        this.unbindMe();
    }

});

