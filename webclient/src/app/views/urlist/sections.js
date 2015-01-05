view.urlist.Sections = ul.bbext.View.extend({

    initialize: function () {
        this.template = this.options.template || ul.util.t("urlist/urls");
        this.type = this.options.type;
        this.listenTo(this.collection, "add", this.appendSection);
    },

    appendSection: function (sectionModel) {
        var sectionView = new view.urlist.Section({
                model: sectionModel,
                type: this.type,
                urlistView: this.options.urlistView
            }),
            html = sectionView.render();

        html.appendTo(this.$el).hide().slideDown("slow");
    },

    render: function () {
        var that = this;

        this.collection.each(this.appendSection, this);
    }

});

