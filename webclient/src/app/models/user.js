// The User model
// ==============
// The user model is a small version of the profile model.
//
// Why is this here? I have not the answer, so this doc needs some FIXME
model.User = ul.bbext.Model.extend({
    name: "model.User",

    mbFetch: true,
    mbAction: "fetch-user",
    mbKey: "user_id",

    idAttribute: "user_id",

    isReady: function () {
        return this.has("username");
    },

    urlRoot: API_ROOT + "user",
    url: function () {
        if (this.has("username"))
            return this.urlRoot + "/" + this.get("username");

        return this.urlRoot + "/" + this.id;
    },

    parse: function (response) {
        if (response.screen_name === ""){
            response.screen_name = response.username;
        }

        return response;
    }
});
