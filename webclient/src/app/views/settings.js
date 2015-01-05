view.Settings = ul.bbext.View.extend({

    events: {
        // Callback for List Page
        "click .js-password-add"        : "addPassword",
        "click .js-password-edit"       : "editPassword",
        "click .js-deactivate-account"  : "deactivateAccount",

        // Save
        "click .js-settings-save"       : "saveSettings",

        // Social connections
        "change .js-oauth"              : "oauthCallback",

        "keyup input[data-validator]"   : "validateInput"
    },

    initialize: function () {
        this.listenTo(C.get("user"), "change:profile_image", this.updateProfileImage);
        this.listenTo(C.get("user"), "change:progress"     , this.updateCompletion);
    },

    validateInput: function (e) {
        view.utils.validateInput( $(e.target) );
    },

    render: function () {
        var json = this.model.toJSON({calculated: true});
        json.api_root = API_ROOT;

        // var json = this.model.get("user");
        var template = ul.util.t("dashboard/settings");

        this.$el.html(template(json));

        if (getLocationParameter("error")) {
            view.utils.displayAlert(
                "Sorry, there is another Urlist profile connected to this account",
                "error");
        }

        this.updateCompletion();
        this.documentScript();

        return this.$el;
    },

    addPassword: function (e) {
        var dialog = new view.dialog.AddPassword({
            dialogClass: "dialog-password-add",
            closeOnOverlay: true
        });

        dialog.render();

        return false;
    },

    recoverPassword: function (e) {
        var dialog = new view.dialog.RecoverPassword({
            dialogClass: "dialog-recover-password",
            closeOnOverlay: true
        });

        dialog.render();

        return false;
    },

    editPassword: function (e) {
        var dialog = new view.dialog.EditPassword({
            dialogClass: "dialog-password-edit",
            closeOnOverlay: true
        });

        dialog.render();

        return false;
    },

    deactivateAccount: function (e) {
        var dialog = new view.dialog.DeactivateAccount({
            model: this.model,
            dialogClass: "dialog-deactivate-account",
            closeOnOverlay: true
        });

        dialog.render();

        return false;
    },

    updateProfileImage: function (model) {
        this.$(".js-profile-image").attr("src", model.get("profile_image")  + "?v=" + Math.random());
    },

    saveSettings: function () {
        if (view.utils.validateInput(this.$("input.js-screen-name"))) {
            var that = this,
                payload = _.purge({
                    "screen_name"       : this.$("input[name='screen_name']").val(),
                    "short_bio"         : this.$("input[name='short_bio']").val(),
                    "location"          : this.$("input[name='location']").val(),
                    "website"           : this.$("input[name='website']").val(),
                    "show_facebook_link": this.$("input[name='show_facebook_link']").is(":checked"),

                    "username"          : this.$("input[name='username']").val(),

                    "notify_add_url"    : this.$("input[name='notify_add_url']").is(":checked"),
                    "notify_relist"     : this.$("input[name='notify_relist']").is(":checked"),
                    "notify_follow_user": this.$("input[name='notify_follow_user']").is(":checked"),
                    "notify_follow_list": this.$("input[name='notify_follow_list']").is(":checked"),
                    "notify_suggest_url": this.$("input[name='notify_suggest_url']").is(":checked")
                });


            UL.Broker.push("update-profile", { user_id: C.get("user").get("user_id") }, payload)
                .done(function () {

                    if (payload.username != C.get("user").get("username")) {
                        that.$("input[name='username']").replaceWith("<em>{0}</em>".format(payload.username));
                        C.get("user").set("username_changed_at", "now");
                    }

                    C.get("user").fetch();
                    view.utils.displayAlert("Settings saved!", "confirm");
                })
                .fail(function (error) {
                    if (error == "UsernameAlreadyTaken")
                        view.utils.displayAlert("Username already taken", "error");
                    else if (error == "ValidationError")
                        view.utils.displayAlert("Username can contain only letters, numbers and underscore", "error");
                    else
                        view.utils.displayAlert("There was an error saving your settings :(", "error");
                });
        } else {
            view.utils.displayAlert("I'm sorry Dave, I'm afraid I can't do that. You need a name.", "hal9000");
        }
    },

    oauthCallback: function (e) {
        var provider  = $(e.target).attr("data-provider"),
            connect   = $(e.target).is(":checked");

        if (connect)
            window.location = "{0}login/{1}?next={2}".format(API_ROOT, provider, window.location);
        else {
            if (this.$(".js-oauth:checked").length == 0) {
                view.utils.displayAlert("You need to be connected with at least one social network!", "error");
                $(e.target).prop("checked", true);
            } else {
                UL.Broker.push("remove-oauth", {
                    user_id: C.get("user").get("user_id"),
                    provider: provider });
            }
        }
    },

    updateCompletion: function () {
        var toFillIn = this.model.get("progress");
        this.$(".js-completion-ul").children().css("text-decoration", "line-through");

        var percentage = this.model.progressPercentage();
        this.$(".js-progress_percentage").text( percentage + "%" );

        if (toFillIn.length > 0) {
            for (var i=0; i < toFillIn.length ; i+=1) {
                var $li = this.$( "li[data-progress='{0}']".format(toFillIn[i]) );
                $li.css("text-decoration", "");
            }
            this.$(".js-progress-box").removeClass("is--confirm");
        } else {
            this.$(".js-progress-box").addClass("is--confirm");
        }
    },

    documentScript: function () {
        var that     = this,
            spinelem = this.$(".js-profile-image-container")[0],
            iframe   = this.$(".js-submit-profile-picture"),
            spinner;

        // Profile picture
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
    }

});

