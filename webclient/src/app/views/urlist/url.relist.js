view.urlist.Relist= ul.bbext.View.extend({

    events: {
    },

    initialize: function () {
    },

    renderOne: function (list_hash, user_id, isOriginal) {
        var that          = this,
            listModel = new ul.model.Urlist({ hash: list_hash }),
            authorModel = new model.User({ user_id: user_id });

        listModel.whenReady()
            .then( function () { return authorModel.whenReady(); })
            .then( function () {
                var template = ul.util.t("urlist/url.relist.{0}".format(isOriginal ? "original" : "item")),
                    json = {
                        username: authorModel.get("username"),
                        screen_name: authorModel.get("screen_name"),
                        profile_image: authorModel.get("profile_image"),
                        title: listModel.get("title"),
                        hash: list_hash
                    };

                if (isOriginal)
                    that.$(".js-relists").prepend(template(json));
                else
                    that.$(".js-relists").append(template(json));
        });

    },

    renderOriginal: function () {
        var list_hash = this.model.get("from_list_hash"),
            user_id   = this.model.get("from_user_id");

        if (list_hash)
            this.renderOne(list_hash, user_id, true);
    },

    renderItem: function (relist) {
        var list_hash = relist.target_list_hash,
            user_id   = relist.user_id;

        this.renderOne(list_hash, user_id);
    },

    render: function () {
        var template = ul.util.t("urlist/url.relist");
        this.$el.html(template());

        this.renderOriginal();
        _.each(this.model.get("relists"), this.renderItem, this);

        return this.$el;
    }

});

