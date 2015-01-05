model.Section = ul.bbext.Model.extend({

    idAttribute: "section_id",

    initialize: function (attrs, options) {
        this.urlist = options.urlist;
        this.urls = options.urls;
        this.calculated(this.getTitleSlug, "title_slug", this);
        this.calculated(this.getUrlsAmount, "urls_amount", this);
        this.calculated(this.getCid, "cid", this);

        this.set("empty_title", "Section {0}".format(this.get("position")));
    },

    getLocalUrls: function () {
        return this.urls.where({ section: this.id });
    },

    getTitleSlug: function () {
        var title = this.get("title") ? this.get("title") : this.get("empty_title");
        return slugify(title, "section-{0}-".format(this.get("position")));
    },

    getUrlsAmount: function () {
        return this.getLocalUrls().length;
    },

    getCid: function () {
        return this.cid;
    },

    prevSection: function () {
        var rs = this.sections.where({ position: this.get("position") - 1 });
        if (rs.length > 0)
            return rs[0];
    },

    nextSection: function () {
        var rs = this.sections.where({ position: this.get("position") + 1 });
        if (rs.length > 0)
            return rs[0];
    }

});

