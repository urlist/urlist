view.urlist.Comment = ul.bbext.View.extend({

    events: {
        "click .js-delete-comment": "deleteCommentCallback"
    },

    initialize: function () {
        this.listenTo(this.model, "destroy", this.unbindMe);
    },

    renderUser: function () {
        var that = this,
            author = this.model.get("author");

        this.model.get("author").whenReady().done( function () {
            that.$(".js-author-avatar").attr("src", author.get("profile_image"));
            that.$(".js-author").attr("href", "/library/" + author.get("username"));
            that.$(".js-author").text(author.get("screen_name"));
        });
    },

    canDelete: function () {
        var cUser   = C.get("user"),
            author  = this.model.get("author"),
            policy  = policies["urlist"]["remove_comment"],
            val     = policy(cUser, this.options.urlistModel),
            isMine  = author.get("user_id") == cUser.get("user_id");

        return val || isMine;
    },


    render: function () {
        var template    = ul.util.t("urlist/comments.item"),
            json        = this.model.toJSON({ calculated: true });

        json.can_delete = this.canDelete();
        this.$el.html(template(json));
        this.renderUser();

        return this.$el;
    },

    deleteCommentCallback: function (e) {
        var dialog = new view.dialog.GenericDelete({
                what: "comment",
                closeOnOverlay: true
            }),

            listHash = this.options.urlistModel.id,
            commentId = this.model.id;

        dialog.render();

        dialog.once("submit", function () {
            UL.Broker.push("remove-comment", {
                list_hash   : listHash,
                comment_id  : commentId });
        });

        return false;
    }

});

