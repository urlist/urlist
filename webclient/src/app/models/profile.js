model.Profile = ul.bbext.Model.extend({
    name: "model.Profile",

    urlRoot: API_ROOT + "profile",

    idAttribute: "username",

    initialize: function() {
        this.calculated(this.isMine, "is_mine", this);
        this.calculated(this.getMyListsCount, "my_lists_count", this);
        this.calculated(this.getFollowingListsCount, "following_lists_count", this);
        this.calculated(this.getFollowingUsersCount, "following_users_count", this);
        this.calculated(this.getFollowedByUsersCount, "followed_by_users_count", this);
        this.calculated(this.hasFacebook, "has_facebook", this);
        this.calculated(this.hasTwitter, "has_twitter", this);
        this.calculated(this.progressNum, "progress_num", this);
        this.calculated(this.progressTot, "progress_tot", this);
    },

    ABGroup: function () {
        var id = this.get("origin_id") || this.get("user_id"),
            group = parseInt(id.substr(id.length - 1), 16) % 2;

        return group ? "A" : "B";
    },

    progressNum: function () {
        var num = parseInt(this.progressTot() - this.get("progress").length);
        return num;
    },

    progressTot: function () {
        var tot = 4;
        return tot;
    },

    hasTwitter: function () {
        return this.get("twitter_username") !== "";
    },

    hasFacebook: function () {
        return this.get("facebook_username") !== "";
    },

    isAnonymous: function () {
        return !!this.get("is_anonymous");
    },

    isReady: function () {
        return this.has("lists");
    },

    progressPercentage: function () {
        var total    = 4; // The amount of fields
        var progress = this.get("progress").length;
        var missing  = total - progress;

        return Math.round(missing * 100 / total);
    },

    isMine: function () {
        return C.get("user").get("user_id") == this.get("user_id");
    },

    isNewbie: function () {
        return this.getMyListsCount() == 0;
    },

    getListsByMe: function () {
        return this.get("lists").where({ user_id: C.get("user").get("user_id") });
    },

    getMyListsCount: function () {
        return this.attributes["lists"].length;
    },

    getFollowingListsCount: function () {
        return this.attributes["followed_lists"].length;
    },

    getFollowingUsersCount: function () {
        return this.attributes["following_users"].length;
    },

    getFollowedByUsersCount: function () {
        return this.attributes["followed_by_users"].length;
    },

    url: function () {
        if (this.has("username"))
            return this.urlRoot + "/" + this.get("username");

        return this.urlRoot + "/" + this.get("user_id");
    },

    parse: function (response) {
        if (response.secret_lists_left < 0){
            response.secret_lists_left = 0;
        }

        response.progress = response.progress || [];

        response.saved_searches = new collection.SavedSearches( response.saved_searches );

        response.followed_by_users = new collection.Users( response.followed_by_users );
        response.following_users = new collection.Users( response.following_users );
        response.lists = new collection.Urlists(response.lists);
        response.followed_lists = new collection.Urlists(response.followed_lists);

        // If no screen name is set, then set username to be screen name
        response.original_screen_name = response.screen_name;
        if (response.screen_name === ""){
            response.screen_name = response.username;
        }

        return response;
    }
});

