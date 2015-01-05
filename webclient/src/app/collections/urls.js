collection.Urls = ul.bbext.Collection.extend({
    model: ul.model.Url,

    initialize: function (models, options) {
        this.type = options.type;
        this.urlist = options.urlist;
    },

    getLowerPos: function () {
        if (this.length)
            return this.at(0).get("position");
        else
            return;
    },

    getUpperPos: function () {
        if (this.length)
            return this.at(this.length - 1).get("position");
        else
            return;
    },

    comparator: function (a, b) {
        return a.get("section") * 10000 + a.get("position") > b.get("section") * 10000 + b.get("position") ? 1 : -1;
    }

});

