collection.Comments = ul.bbext.Collection.extend({

    model: model.Comment,

    comparator: function (a, b) {
        return a.get("created_at") < b.get("created_at") ? 1 : -1;
    }

});

