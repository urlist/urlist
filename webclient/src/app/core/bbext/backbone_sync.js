(function () {
    // FIXME make this shit global
    var mbMessageMap = {id: 0, action: 1, target: 2, payload:3},
        sync = Backbone.sync,
        ticker = new ul.Ticker({ threshold: 100 });

    Backbone.mbHyperDriveSync = function (method, model, options) {
        var deferred = $.Deferred();

        if (options.success)
            deferred.done(options.success);
        if (options.error)
            deferred.fail(options.error);

        deferred.done(function (resp, status, xhr) {
            model.trigger("sync", model, resp, options); });
        deferred.fail(function (xhr, status, thrown) {
            model.trigger('error', model, xhr, options); });

        ticker.push( [method, model, deferred] );

        return deferred;
    };

    ticker.on("flush", function (buffer) {
        var messages = [],
            deferredMap = {};

        for (var i = 0; i < buffer.length; i++) {
            var target = {},
                model = buffer[i][1],
                deferred = buffer[i][2],
                user_id = C.get("user").get("is_anonymous") ? "anonymous" : C.get("user").get("user_id"),
                id = [user_id, model.mbAction, model.id].join(":");

            if (deferredMap[id] === undefined) {
                target[model.mbKey] = model.id;
                messages.push([ id, model.mbAction, target, {}, {} ]);
                deferredMap[id] = deferred;
            } else {
                if (! _.isArray(deferredMap[id]))
                    deferredMap[id] = [ deferredMap[id] ];

                deferredMap[id].push(deferred);
            }
        }

        $.ajax({
            url: API_ROOT + "hyperdrive",
            type: "POST",
            data: JSON.stringify(messages),
            contentType: "application/json",
            dataType: "json",
            xhrFields: { withCredentials: true }
        })
        .done(function (resp, status, xhr) {
            for (var i = 0; i < resp.length; i++) {
                var message = resp[i],
                    isError = message[mbMessageMap.action] == "Exception" ||
                              message[mbMessageMap.action] == "OperationalError",
                    data = message[mbMessageMap.payload],
                    id = message[mbMessageMap.id],
                    deferred = deferredMap[id];

                if (isError)
                    console.error("hyperdrive",
                        message[mbMessageMap.payload]);

                //FIXME: need refactoring
                if (_.isArray(deferred))
                    _.each(deferred, function (d) {
                        if (isError)
                            d.reject(xhr, status, data);
                        else
                            d.resolve(data, status, xhr);
                    });
                else {
                    if (isError)
                        deferred.reject(xhr, status, data);
                    else
                        deferred.resolve(data, status, xhr);
                }
            }
        })
        .fail(function (xhr, status, thrown) {
            console.log("FAIL HyperDrive sync", arguments);

            _.each(deferredMap, function (deferred) {
                deferred.reject(xhr, status, "Server error");
            });
        });
    });

    Backbone.mbSync = function (method, model, options) {
        var deferred = $.Deferred();

        if (options.success)
            deferred.done(options.success);

        if (options.error)
            deferred.fail(options.error);

        deferred.done(function (resp, status, xhr) {
            model.trigger("sync", model, resp, options); });

        deferred.fail(function (xhr, status, thrown) {
            model.trigger('error', model, xhr, options); });


        var target = {};
        target[model.mbKey] = model.id;

        $.ajax({
                url: API_ROOT + "motherbrain",
                type: "POST",
                data: JSON.stringify([ uuid(), model.mbAction, target, {}, {} ]),
                contentType: "application/json",
                dataType: "json",
                xhrFields: { withCredentials: true }
            })

            .done(function(resp, status, xhr) {
                deferred.resolve.call(this, resp[mbMessageMap.payload], status, xhr);
            })

            .fail(function() {
                deferred.reject.apply(this, arguments);
            });

        return deferred;
    };

    Backbone.sync = function (method, model, options) {
        // XXX: maybe a little bit gross
        if (method == "delete") return;

        if ((method == "read") && model.mbFetch === true && UL.config.hyperdrive.boost) {
            return Backbone.mbHyperDriveSync(method, model, options);
        } else {
            return sync(method, model, options);
        }
    };
}) ();

