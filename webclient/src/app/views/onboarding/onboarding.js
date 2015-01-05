view.Onboarding = ul.bbext.View.extend({

    // Onboarding
    // ==========
    //
    // Welcome to The Urlist, I'll be your guide.
    //
    // This prototype class is responsible to guide the user to build it's
    // network feed, follow and invite Facebook friends.

    events: {
        "click .js-next"        : "goNext",
        "click .js-skip"        : "goSkip",

        // Events related to the first step, aka "Pick some categories".
        "click input[name='category']": "selectCategory",

        // Upload profile picture in Complete your Profile
//        "click .js-upload"      : "uploadProfilePicture",
        // Events related to the "Follow friends" step.
        "click .js-follow-user" : "followUser",
        "click .js-invite-user" : "inviteUser"
    },

    manageErrors: function () {
        var error = getLocationParameter("error");

        if (error == "ConnectedToAnotherAccount")
            view.utils.displayAlert("Oops, this Facebook account has been already connected to another account", "error");

    },

    manageSteps: function () {
        var step = getLocationParameter("step");

        if (step == "suggest_users") {
            // When the user choses to complete profile with a facebook login,
            // they are redirected back to the onboarding. But they should only see the
            // "invite friends" part, because that is the only thing relevant.
            this.nextStep = this.renderSuggestUsers;
        } else if (step == "complete_profile") {
            this.nextStep = this.renderCompleteProfile;
        } else {
            this.nextStep = this.renderSuggestUsers;
        }
    },

    initialize: function () {
        this.manageErrors();
        this.manageSteps();

        this.model = C.get("user");

        this.listenTo(this.model, "sync", this.updateProfileImage);
    },


    // Navigation and utility methods
    // ==============================

    cleanUp: function () {
        this.$el.empty();
    },

    goNext: function () {
        this.nextStep.call(this);
        this.profilePicture();
        return false;
    },

    goSkip: function () {
        this.nextStep.call(this);

        return false;
    },

    toggleNextButton: function (enabled) {
        // ### Utility method to toggle the status for the "next" button.
        // It takes a flag, if the flag is true then enable the button and
        // make it green, otherwise disable it.

        // It's up to the callee define the logic to enable or disable the
        // "next" button.
        this.$(".js-next").toggleClass("inactive", !enabled);
        this.$(".js-next").toggleClass("confirm",   enabled);
    },

    getFacebookUrl: function (step) {
        var currentUrl = "//" + window.location.host;
        return API_ROOT + "login/facebook?next=" + encodeURIComponent(addParamToUrl(currentUrl, "step", step));
    },

    finishOnboarding: function () {
        UL.Broker.push("onboarding-complete").done(function () {
            var loc = $.cookie("_ul_suggest_list_hash") || "/";

            window.location = loc;
        });
    },

    // Render methods and callbacks
    // ============================
    //
    // Here are all the rendering methods used to manage the onboarding
    // flow.

    render: function () {
        // Here starts the logic flow
        this.goNext();

        return this.$el;
    },



    // Pick Categories
    // ---------------
    renderPickCategories: function () {
        this.cleanUp();

        var that = this,
            template = ul.util.t("welcome/pick_categories"),
            json = { all_categories: UL.ORDERED_CATEGORIES };

        this.$el.append(template(json));

        this.nextStep = function () {
            // Extract the ids of the checked items.
            var categoriesIds = _.map(that.$("input[name='category']:checked"), function (e) { return $(e).val(); });

            // Communicate with the server.
            UL.Broker.push("onboarding-pick-categories", {}, { categories_slugs: categoriesIds });

            // And then render the "Suggest Users" step.
            that.renderSuggestUsers.call(that);
        }

        return this.$el;
    },

    selectCategory: function (e) {
        // Callback to enable the *next* button when the user selects
        // two or more categories.
        var checkedLength = this.$("input[name='category']:checked").length;
        this.toggleNextButton(checkedLength >= 2);
    },



    // Suggested Users
    // ---------------
    // Also known as "Find Friends"
    renderSuggestUsers: function (options) {
        this.cleanUp();

        var that      = this,
            json      = this.model.toJSON(),
            fbFriends = new model.FacebookFriends(),
            template  = ul.util.t("welcome/suggest_users");

        json.facebook_url = this.getFacebookUrl("suggest_users");

        // Prepare array to store Facebook invites
        this.inviteFromFacebook = this.inviteFromFacebook || [];

        //this.$el.find(".js-next").addClass("confirm"); // This does not work, but should

        // Wait for the data.
        fbFriends.whenReady().done(function () {
            _.extend(json, fbFriends.toJSON());
            that.$el.append(template(json));
            if (that.model.get("facebook_username") === ""){
                that.$(".js-show-connect").removeClass("hide");
                that.$(".js-show-invite").addClass("hide");
            }
        });

        this.nextStep = function () {
            if (this.model.get("facebook_username") !== "") {
                if (that.inviteFromFacebook.length > 0)
                    that.dialogInviteFacebookUsers.call(that, that.finishOnboarding);
                else
                    that.finishOnboarding();
            } else {
                // If not logged into facebook
                that.renderCompleteProfile();
            }
        };

        return this.$el;
    },

    followUser: function (e) {
        var $el = $(e.target),
            id = $(e.target).closest("a").attr("data-user_id");

        $el.html("Following"); // When clicking follow, change the text on the button to following. UX baby.
        $el.addClass("inactive"); // When clicking follow, change the text on the button to following. UX baby.

        UL.Broker.push("follow-user", { user_id: id });

        return false;
    },

    inviteUser: function (e) {
        var id = $(e.target).closest("a").attr("data-facebook_id");
        this.$(e.target).html("Invited");

        this.$(e.target).addClass("inactive");

        // FB Dialog will not open if there are doubled
        // ids, this should not happen (we disable the button
        // after the user clicks "invite") but is better to be
        // sure :)
        if (_.indexOf(this.inviteFromFacebook, id) == -1)
            this.inviteFromFacebook.push(id);

        // The FB Dialog to invite friends limits to 50 invites
        // per time. If we hit the limit we display the dialog
        // and let the user continue with the selection.
        if (this.inviteFromFacebook.length == 50)
            this.dialogInviteFacebookUsers();

        return false;
    },

    dialogInviteFacebookUsers: function (callback) {
        // This is the fugly little blue dialog window facebook provides
        var that = this;

        FB.ui({
            method : 'apprequests',
            title  : 'Invite your friends to Urlist!',
            message: "I just signed up to Urlist, give it a try!",
            to: this.inviteFromFacebook
        }, function () {
            that.inviteFromFacebook = [];
            callback && callback();
        });
    },



    // Complete profile
    // ----------------
    renderCompleteProfile: function () {
        var that     = this,
            json     = this.model.toJSON(),
            template = ul.util.t("welcome/complete_profile");

        this.cleanUp();

        json.facebook_url = this.getFacebookUrl("complete_profile");

        this.$el.append(template(json));

        this.nextStep = this.checkProfileData;

        return this.$el;
    },

    checkProfileData: function () {
        var that            = this,
            validScreenName = view.utils.validateInput(this.$("input[name='screen_name']")),
            validUsername   = view.utils.validateInput(this.$("input[name='username']")),

            payload = _.purge({
                    "screen_name"       : this.$("input[name='screen_name']").val(),
                    "short_bio"         : this.$("input[name='short_bio']").val(),
                    "username"          : this.$("input[name='username']").val()
            });

        if (!validScreenName || !validUsername) return;

        UL.Broker.push("update-profile", { user_id: C.get("user").get("user_id") }, payload)
            .done(function () {
                console.log("update successful, go to network!");
                that.finishOnboarding();
            })
            .fail(function (error) {
                if (error == "UsernameAlreadyTaken") {
                    view.utils.displayAlert("Username already taken", "error");
                } else if (error == "ValidationError") {
                    view.utils.displayAlert("Username can contain only letters, numbers and underscore", "error");
                } else {
                    //view.utils.displayAlert("There was an error saving your settings :(", "error");
                    console.log("OK, this is not nice, if we have a very bad error, we just go to the user's network.");
                    UL.Broker.push("onboarding-complete").done(function () { window.location = "/"; });
                }
            });
    },

    updateProfileImage: function (model) {
        this.$(".js-profile-image").attr("src", model.get("profile_image") + "?v=" + Math.random());
    },

    profilePicture: function () {
        var that     = this,
            spinelem = this.$(".js-profile-image-container")[0],
            iframe   = this.$(".js-submit-profile-picture"),
            spinner;

        this.$(".js-upload").click(function(){
            that.$(".js-upload-real").trigger("click");
            return false;
        });

        this.$(".js-upload-real").change(function() {
            that.$("form").submit();
            that.$(".js-profile-image").fadeTo(500, 0.2);
            spinner = new Spinner().spin(spinelem);
        });

        iframe.load(function () {
            var content = iframe.contents().text();

            // XXX: IE8 smells like dog buns
            if (content == "")
                return;

            if (content == "OK")
                C.get("user").fetch();

            else if (content == "IncorrectSize")
                view.utils.displayAlert("The image you tried to upload is too small." +
                                        "It needs to be at least 180px wide and 180px tall.", "error");
            else
                view.utils.displayAlert("The image you tried to upload is not valid." +
                                        "Please give it another try!", "error");


            spinner.stop();
            that.$(".js-profile-image").fadeTo(500, 1);
        });
    },



    // Install bookmarklet
    // -------------------

    renderGetBookmarklet: function () {
        this.cleanUp();

        var template = ul.util.t("welcome/get_bookmarklet");
        this.$el.append(template(this.json));

        return this.$el;
    }
});

