collection.Urlists = ul.bbext.Collection.extend({

    model: ul.model.Urlist,

    comparators: {
        noop       : function (x, y) { return 0; },
        rank       : function (x, y) { return (x.get("rank") < y.get("rank")) ? 1 : -1; },
        lastUpdated: function (x, y) { return (x.get("last_action_time") < y.get("last_action_time")) ? 1 : -1; },
        lastCreated: function (x, y) { return (x.get("creation_time") < y.get("creation_time")) ? 1 : -1; }
    },

    comparator: function (x, y) {
        return this.comparators.lastUpdated(x, y);
    },

    filterByUser: function (user_id) {
        return new collection.Urlists(this.where({ user_id: user_id }));
    },

    filterOutUser: function (user_id) {
        return new collection.Urlists(_.filter(this.models, function (m) { return m.attributes.user_id != user_id; }));
    }

});

