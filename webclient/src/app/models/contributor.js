model.Contributor = ul.bbext.Model.extend({
    //name: "model.Contributor",

    idAttribute: "user_id",

    defaults: {
        status: "pending"
    },

    fetch: function () {
        var user = this.get("user");
        return user.fetch.apply(user, arguments);
    },

    isReady: function () {
        return this.get("user").isReady();
    },

    toJSON: function () {
        var json = this.get("user").toJSON();
        return _.extend(json, _.clone(this.attributes));
    },

    parse: function (response) {
        response.user = new model.User({ user_id: response.user_id });
        return response;
    }

});

