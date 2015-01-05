( function () {

    helpers.generatePolicy = function (subset, user, obj) {
        var r = {},
            p = policies[subset];

        for (var name in p)
            r[name] = p[name] (user, obj);

        return r;
    };

}) ();

