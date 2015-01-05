model.Comment = ul.bbext.Model.extend({

    idAttribute: "comment_id",

    initialize: function (attributes, options) {
        this.calculated(this.htmlComment, "html_comment", this);
    },

    parseDefaults: function () {
        return {
            user_id: C.get("user").get("user_id"),
            creation_time: new Date().toUTCISOString()
        };
    },

    parse: function (response) {
        _.defaults(response, _.result(this, "parseDefaults"));

        response.author = new model.User({ user_id: response.user_id });

        return response;
    },

    htmlComment: function () {
        return mdma(this.get("comment"));
    }

});
