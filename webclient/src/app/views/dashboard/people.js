view.dashboard.People = ul.bbext.View.extend({

    events: {
        "click .js-load-more": "loadMore"
    },

    initialize: function () {
        this.listenTo(this.collection, "add", this.addUser);
        this.listenTo(this.collection, "remove", this.removeUser);
    },

    removeUser: function (userModel) {
        this.$("li[data-username='{0}']".format(userModel.get("username"))).remove();
    },

    addUser: function (userModel) {
        var that = this;

        userModel.whenReady().done( function () {
            var template = ul.util.t("dashboard/people.item"),
                json = userModel.toJSON();

            that.$("ul").append(template(json));
        });
    },

    loadMore: function () {
        var rendered = this.$("li").length,
            total    = this.collection.length,
            limit    = _.min([ rendered + 20, total ]);

        for (var i = rendered; i < limit; i++)
            this.addUser(this.collection.at(i));

        this.$(".js-load-more").toggleClass("hide", limit == total);

        return false;
    },

    render: function () {
        var template = ul.util.t("dashboard/people");
        this.$el.html(template());

        this.loadMore();

        return this.$el;
    }

});
