(function (exports) {
    'use strict';

    // Description
    // -----------
    //
    // Core function to register new objects into the global namespace `ul`.
    // The `ul.register` is a handy function used across the whole application
    // used by all the components we have. Every single component is adding
    // itself to the global `ul` namespace using this function.
    //
    //
    // Api
    // ---
    // `ul.register(key, obj)`: register the object `obj` in the global namespace,
    // under the name `key`. If `key` has already been defined, a *warning* is
    // logged, and the `obj` will replace the old value. If `key` is the name of
    // a core function (like `register`, and all the other functions registered
    // in this module) an **exception** is thrown.
    //
    // `key` can be written with a dot notation; if so, the `obj` will be nested
    // into the specified sub-hash.
    //
    //
    // Example
    // -------
    //     ul.register('foo.bar', [0, 1, 1, 2])
    //     // ul.foo.bar -> [0, 1, 1, 2]
    //
    //     ul.register('register', 'troll')
    //     // [E] Trying to override core function, abort


    // Code
    // ----

    var ul      = {},
        protect = [];


    function register (key, obj) {
        var tokens = key.split('.'),
            last   = ul,
            token;

        // If you are trying to override a core function registering your
        // own object, abort raising an exception
        if (_.indexOf(protect, tokens[0]) != -1)
            throw 'Trying to override core function, abort';

        // Iterate all over the tokens in the `key`
        for (var i = 0; i < tokens.length; i++) {
            token = tokens[i];

            // If this is the last step in our iteration
            if (i == tokens.length - 1) {

                // and the element was already registered, then log a warning
                if (last[token] !== undefined) {
                    console.warning('Override {0} with'.format(key), obj);
                }

                // and then save the new object
                last[token] = obj;

            // otherwise if the token is not the last one, and it has no value
            // create a new hash
            } else if (last[token] === undefined) {
                last[token] = {};
            }

            // update the reference to the last token for the next iteration
            last = last[token];
        }
    }

    // Yo dawg, I heard you like `register`, so I register `register`
    // using `register`.
    register('register', register);

    // Iterate all over the registered properties and save them in a
    // reference array. This allow us to throw an exception later on.
    for (var registered in ul)
        protect.push(registered);

    // Set `ul` as the global namespace for **Urlist**.
    exports.ul = ul;

}) (typeof exports === 'undefined' ? this : exports);
