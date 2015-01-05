model.Landing = ul.bbext.Model.extend({

    name: "model.Landing",

    idAttribute: "key",

    url: API_ROOT + "landing",

    isReady: function () {
        return this.has("key");
    },

    parse: function (response) {
        // XXX: refactoring needed
        var reduceFeat = function (list) {
            return _.reduce(list, function (memo, l) { l.is_featured && memo.push(l.hash); return memo; }, []);
        };

        var reduceHash = function (list) {
            return _.reduce(list, function (memo, l) {
                memo.push({ hash: l.hash });
                return memo;
            }, []);
        };

        var lists_featured;


        // extract the hashes for featured lists
        lists_featured = reduceFeat(response.lists);

        // create collections using only the hashes
        response.lists = new collection.Urlists(reduceHash(response.lists));
        response.lists.featured = lists_featured;

        return response;
    }

});

