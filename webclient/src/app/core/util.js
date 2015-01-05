(function () {
    'use strict';

    // The endpoint for hashtags gives us a result that works well in mongo databases, but rather badly in our app. Therefore it needs to be converted.
    ul.register('util.kato', function (sourceArray, parentKey, childKey) {
        // var input = {"lists": ["qgp", "2ar"], "hashtag": "#foobar"};
        // var output = {"matches": [  ]}
        // {"matches": [{"hash": "ewq"}, {"hash": "47h"}, {"hash": "Mda"} ]}
        var toObject = function (array) {
            var hashes = [];

            if (!array) return hashes;

            for (var i = 0; i < array.length; i = i + 1) {
                if (array[i] !== undefined) {
                    var tempHash = {}
                    tempHash[childKey] = array[i] ;
                    hashes.push(tempHash);
                }
            }
            return hashes;
        }
        var output = {};

        // One obscure case would be that the parent key of both in and out-data are not the same. If the source does not have the key we want, we default to "lists" as that is the case in our program.
        if( !!sourceArray[parentKey] ) {
            output[parentKey] = toObject( sourceArray[parentKey] );
        } else {
            output[parentKey] = toObject( sourceArray.lists );
        }

        return output;
    });

    // Render a handlebars template
    ul.register('util.t', function(name){
        return TEMPLATES[name];
    });

    ul.register('util.getCurrentProfile', function() {
        // Often we need to know who the currently logged in user is.
        // Since Urlist Web Client has two kinds of user models,
        // the one for "user" did not suffice.

        // A good way to use in views is
        // this.model = this.model || ul.util.getCurrentProfile();

        // Convert C.get("user") to a model.Profile
        var tempModel = C.get("user");

        var profileModel = new model.Profile({
            username: tempModel.get("username")
        });

        return profileModel;
    });

    ul.register('util.prettydate', function(dt, verbose){
        var date   = new Date(dt).getTime(),
            now    = new Date().getTime(),
            offset = (now - date) / 1000,
            unit   = "s",
            other  = { s: "seconds ago", m: "minutes ago", h: "hours ago", d: "days ago" };

        // Pyramid code is waiting for Maya
        if (offset > 60) {
            offset /= 60;
            unit = "m";

            if (offset > 60) {
                offset /= 60;
                unit = "h";

                if (offset > 24) {
                    offset /= 24;
                    unit = "d";
                    if (offset > 60) {
                        offset = null; }
                }
            }
        }

        if (offset)
            return "{0}{1}".format(parseInt(offset), verbose ? " " + other[unit] : unit);
        else
            return "time";
    });

}) (typeof exports === 'undefined' ? this : exports);

