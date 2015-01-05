collection.Sections = ul.bbext.Collection.extend({
    model: model.Section,

    getSectionsLeft: function () {
        var left = UL.config.sections_limit - this.length
        return Math.max(0, left);
    }

});

