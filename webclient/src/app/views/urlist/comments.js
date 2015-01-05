view.urlist.Comments = ul.bbext.View.extend({

    COMMENTS_AMOUNT: 5,

    events: {
        "click .js-add-comment": "submitComment",
        "click .js-load-more": "loadMore"
    },

    initialize: function () {
        this.listenTo(this.collection, "add", this.prependComment);
        this.listenTo(this.collection, "add remove", this.updateCommentsCounter);
    },

    updateCommentsCounter: function () {
        this.$(".js-comments-amount").text(this.collection.length);
    },

    submitComment: function (e) {
        var $textarea   = this.$("textarea[name='comment']"),
            comment     = $.trim($textarea.val()),
            listHash    = this.model.get("hash");

        $textarea.val("");

        if (comment.length > 0)
            UL.Broker.push("add-comment",
                    { list_hash: listHash },
                    { comment: comment });

        return false;
    },

    addComment: function (commentModel, append) {
        var commentView = new view.urlist.Comment({
                urlistModel:    this.model,
                model:          commentModel
            }),

            $html = commentView.render();

        if (append)
            this.$(".js-comments").append($html);
        else
            this.$(".js-comment-new").after($html);
    },

    appendComment: function (commentModel) {
        this.addComment(commentModel, true);
    },

    prependComment: function (commentModel) {
        this.addComment(commentModel);
    },

    loadMore: function () {
        var rendered = this.$(".js-comment").length,
            total    = this.collection.length,
            limit    = _.min([ rendered + this.COMMENTS_AMOUNT, total ]);

        for (var i = rendered; i < limit; i++)
            this.appendComment(this.collection.at(i));

        this.$(".js-load-more").toggleClass("hide", limit == total);

        return false;
    },

    render: function () {
        var template = ul.util.t("urlist/comments"),
            json = {
                comments_amount : this.collection.length,
                policies        : this.model.getPolicies()
            };

        this.$el.html(template(json));

        this.loadMore();

        return this.$el;
    }

});
