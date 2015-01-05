view.urlist.Summary = ul.bbext.View.extend({

    initialize: function () {
        this.template = ul.util.t("urlist/summary");
        this.listenTo(this.model.get("sections"), "add", this.addItem);
    },

    addItem: function (sectionModel) {
        var itemView = new view.urlist.SummaryItem({
            model: sectionModel,
            urlistModel: this.model
        });

        this.$el.find(".js-section-list").append(itemView.render());
    },

    render: function () {
        var policies = this.model.getPolicies(),
            json = {
                policies: policies,
                sections_amount: this.model.getSectionsAmount()
            };

        this.$el.html( $(this.template(json)) );
        this.model.get("sections").each(this.addItem, this);
        return this.$el;
    }

});

