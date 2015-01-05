view.dialog.SearchImage = Backbone.Dialog.extend({

    subevents: {
        "keypress .js-make-search-input": "inputCallback",
        "click .js-make-search"        : "fetchResults",
        "click .js-result-from-search" : "selectImage",
        "dblclick .js-result-from-search" : "submitForm"
    },

    dialogClass: "search-image",

    fetchResults: function () {
        var query    = slugify(this.$(".js-make-search-input").val()).split("-").join(","),
            loader   = this.$(".js-render-results"),
            endpoint = "http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=873b4ebea72e907cef976690e55f6551&tag_mode=all&safe_search=1&tags={0}&license=1%2C2%2C3%2C4%2C5%2C7&extras=url_l%2Curl_q&format=json&jsoncallback=?".format(query);

        this.$("ul.search-result-list").empty();
        this.$("ul.search-result-list").addClass("active");

        $.ajax({
            url: endpoint,
            dataType: "jsonp"
        })
        .done(_.bind(this.renderResults, this))
        .fail(_.bind(this.failedResults, this));

        this.spinner = new Spinner().spin(loader[0]);

        return false;
    },

    inputCallback: function (e) {
        if (e.keyCode == 13) {
            this.fetchResults();
            return false;
        }
    },

    renderResults: function (data) {
        if (data.stat == "fail")
            return this.failedResults();

        this.clearResults();

        if (data.photos.photo.length > 0) {
            _.each(_.shuffle(data.photos.photo), function (e) {
                var listItem;

                if (e.url_l) {
                    e.author_url = "http://www.flickr.com/photos/{0}/".format(e.owner);
                    listItem = ul.util.t("dialog/search_image.item")(e);
                    this.$(".js-render-results").append(listItem);
                }

            }, this);
        } else {
            var emptyItem = ul.util.t("dialog/search_image.emptyitem");
            this.$(".js-render-results").append(emptyItem);
        }
    },

    clearResults: function () {
        this.spinner.stop();
    },

    failedResults: function (data) {
        this.clearResults();

        var errorItem = ul.util.t("dialog/search_image.erroritem");
        this.$(".js-render-results").append(errorItem);
    },

    selectImage: function(e) {
        var rawImgURL = $(e.target).find("img").attr("data-fullsrc"),
            author    = $(e.target).find("img").attr("data-authorurl"),
            tunnel    = API_ROOT + "redirect?url=";

        this.selectedImage = { url: tunnel + rawImgURL, author: author };

        // Toggles active state for selected thumbnail
        $(e.target).addClass("active").siblings().removeClass("active");
    },

    subrender: function () {
        var template = ul.util.t("dialog/search_image"),
            $html = $(template());

        return $html;
    },

    submitForm: function () {
        this.$("form").submit();
    },

    submit: function () {
        if (this.selectedImage)
            this.trigger("select-image", this.selectedImage.url, this.selectedImage.author);
    }
});
