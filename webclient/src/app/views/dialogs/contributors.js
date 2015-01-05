view.dialog.Contributors = Backbone.Dialog.extend({

    subevents: {
        "keypress input.js-input-contributor" : "contributorSubmitOnEnter",
        "click button.js-add-contributor"     : "contributorSubmit",
        "click .js-contributor-delete"        : "contributorRemove"
    },

    dialogClass: "contributors",

    subinitialize: function () {
        this.listenTo(this.model.get("contributors"), "add", this.eventAddContributor);
        this.listenTo(this.model.get("contributors"), "remove", this.eventRemoveContributor);
        this.listenTo(this.model, "destroy", this.unbindAll);
    },

    contributorSubmitOnEnter: function (e) {
        if (e.keyCode != 13) return;

        //this.contributorSubmit();
        return false;
    },

    contributorSubmit: function () {
        var store = this.$("input.js-input-contributor-store"),
            text  = this.$("input.js-input-contributor");

        if (isEmail(text.val())) {
            UL.Broker.push(
                "add-contributor-by-email",
                { list_hash: this.model.get("hash") },
                { email: text.val() });
        } else {
            UL.Broker.push(
                "add-contributor",
                { list_hash: this.model.get("hash") },
                { user_id: store.val() });
        }

        store.val("");
        text.val("");

        return false;
    },

    contributorRemove: function (e) {
        var contributorId = $(e.target).closest(".js-contributor").attr("data-user-id"),
            contributorModel = new model.Contributor({ user_id: contributorId }, { parse: true });

        var dialog = new view.dialog.DeleteContributor({
                model: contributorModel,
                urlistModel: this.model
            });

        dialog.render();

        return false;
    },

    eventAddContributor: function (contributorModel) {
        var $html = this.subrenderContributor(contributorModel);

        this.$(".js-contributors").append($html);
    },

    eventRemoveContributor: function (contributorModel) {
        var userId = contributorModel.get("user_id"),
            $el = this.$(".js-contributor[data-user-id='{0}']".format(userId));

        $el.fadeOut();
    },

    subrenderContributor: function (contributorModel, options) {
        var tmp = $("<li />"),
            that = this;

        contributorModel.whenReady().done( function () {
            var json = contributorModel.toJSON(),
                template = ul.util.t("dialog/contributors.item");

            if (options)
                _.extend(json, options);

            tmp.html($(template(json)));
        });

        return tmp;
    },

    fetchContributors: function (request, response) {
        var contributorsIds = this.model.get("contributors").pluck("user_id");

        contributorsIds.push(this.model.get("author").get("user_id"));

        var success = function(data) {

            var filtered = _.reject(data.results, function(val){
                return _.indexOf(contributorsIds, val.user_id) >= 0;
            });

            response($.map( filtered, function(item) {
                return {
                    id: item.user_id,
                    value: item.username,
                    label: item.screen_name,
                    avatar_url: item.profile_image
                };
            }));

        };

        $.ajax({
            url: API_ROOT + "search/users.json",
            dataType: "json",
            data: {
                q: request.term
            },
            success: success
        });
    },

    subrenderInputContributor: function ($html) {
        var that = this;

        $html.find(".js-input-contributor").autocomplete({
            minLength: 3,
            source: _.bind(this.fetchContributors, this),
            open: function() {
                $("ul.ui-autocomplete")
                    .removeAttr("style")
                    .css({
                        "z-index" : "999999",
                        "position" : "absolute"
                    })
                    .appendTo(".collaborators-find")
                    .fadeIn(100);
            },
            close:  function(event, ui) {
            },

            focus: function(event, ui) {
                $html.find(".js-input-contributor-store").val(ui.item.id);
                $(".js-input-contributor").val( ui.item.value );
            },

            select: function(event, ui) {
                var user_id = $(".js-input-contributor-store").val();

                $(".js-input-contributor").val("");
                $(".js-input-contributor-store").val("");

                UL.Broker.push(
                    "add-contributor",
                    { list_hash: that.model.get("hash") },
                    { user_id: user_id });

                event.preventDefault(); // Prevent "confirm" action (2nd key stroke)

            }
        }).data("uiAutocomplete")._renderItem = function(ul, item) {

            var itemTmpl = "<a><img src='" + item.avatar_url + "'> " + item.label + " <i>(" + item.value + ")</i></a>";

            return $("<li class='clearfix'></li>")
                .data("item.autocomplete", item).append(itemTmpl).appendTo(ul);

        };

    },

    subrender: function () {
        var me = C.get("user"),
            author = this.model.get("author"),
            json = this.model.toJSON(),
            template = ul.util.t("dialog/contributors"),

            $html = $(template()),

            $author = this.subrenderContributor(author, { author: true }),
            $me = this.subrenderContributor(me, { itsme: true });

        $html.find(".js-contributors").append($author);

        if (me.get("user_id") != author.get("user_id"))
            $html.find(".js-contributors").append($me);

        this.model.get("contributors").forEach(function (contributorModel) {
            if (contributorModel.get("user_id") != me.get("user_id"))
                $html.find(".js-contributors").append(
                    this.subrenderContributor(contributorModel));
        }, this);

        this.subrenderInputContributor($html);

        return $html;
    }

});

