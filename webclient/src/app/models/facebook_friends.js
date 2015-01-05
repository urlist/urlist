// The Facebook Friends model
// ==========================
// The user model is a small version of the profile model.

model.FacebookFriends = ul.bbext.Model.extend({
    urlRoot: API_ROOT + "facebook-friends",

    isReady: function () {
        return this.has("follow");
    },

    parse: function (response) {
        response.to_follow = _.where(response.follow, { is_following: false });
        response.following = _.where(response.follow, { is_following: true  });

        return response;
    }
});
