( function () {
    _.get = function (obj, key, missing) {
        var keys = key.split("."),
            current = obj;

        for (var i = 0; i < keys.length; i++) {
            try {
                current = current[keys[i]];
            } catch(e) {
                current = undefined;
                break;
            }
        }

        return current == null ? missing : current;
    };

    _.purge = function (obj, what) {
        var cleaned = {};

        for (var key in obj)
            obj[key] !== what && (cleaned[key] = obj[key]);

        return cleaned;
    };

}) ();
