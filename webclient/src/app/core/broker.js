// The Broker handles messages 〠
// ==============================
// TODO: Update this to fit the new api specs
// See https://github.com/urlist/motherbrain/wiki/

( function () {
    // The server understands arrays - the values determine in what order the keys will be in that array
    var mbMessageMap = {id: 0, action: 1, target: 2, payload:3};

    var Broker = function (val, options) { };

    Broker.extend = Backbone.View.extend;

    _.extend(Broker.prototype, Backbone.Events, {

        // Send a message - actions listen to this event
        // Then they update the local models, while the server does the same
        // In that way both of them can stay in sync
        push: function (action, target, payload, extras) {
            // So that the client and the server know they're talking about the same thing
            var requestId = uuid(),
                deferred = new jQuery.Deferred();

            // Server does not accept empty payloads
            payload || (payload = {});

            console.debug(
                "[base.broker]",
                "Local message'", action, "'",
                "target:"        ,target,
                "payload:"       ,payload,
                "requestId:"     ,requestId,
                "extras:"        ,extras
                )

            // Fires events that actions listens to
            this.trigger(action, target, _.clone(payload), deferred, extras);
            // and make sure the server does the same
            this._doAjax([requestId, action, target, payload, {}], deferred);

            return deferred;
        },

        trigger: function () {
            var args       = Array.prototype.slice.call(arguments),
                originator = UL.EventOriginator.pop();

            // console.log("originator:", originator);
            args.push(originator);
            Backbone.Events.trigger.apply(this, args);
        },

        _doAjax: function (message, deferred) {
            $.ajax({
                    url: API_ROOT + "motherbrain",
                    type: "POST",
                    data: JSON.stringify( message ),
                    contentType: "application/json",
                    dataType: "json",
                    xhrFields: { withCredentials: true }
                })

                .done( function (data) {
                    console.debug("[base.broker]\t",
                        "Remote message '{0}'".format(data[0]), data[1], data[2], data[3]);
                    if (data[mbMessageMap.action] == "Exception")
                        deferred.reject(data);
                    else if (data[mbMessageMap.action] == "OperationalError")
                        deferred.reject(data[mbMessageMap.payload]);
                    else
                        deferred.resolve(data[mbMessageMap.payload]);
                })

                .fail( function (data) {
                    console.debug("fail", data);
                    deferred.reject(data);
                });
        }


    });

    UL.Broker = new Broker();

} ) ();

