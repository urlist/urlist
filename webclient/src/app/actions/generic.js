( function (broker) {

    var MyAction = actions.Action.extend({

        events: {
            "add-list":     "addList",
            "add-url":      "addUrl"
        },

        addList: function (target, payload, deferred) {
            deferred.done( function (payload) {
                console.log("[MyAction] add-list", payload.hash);
            });
        },

        addUrl: function (target, payload, deferred) {
            deferred.done( function (payload) {
                console.log("[MyAction] add-url", target.list_hash, payload.hash);
            });
        }

    });

    var myAction = new MyAction(broker);
    // myAction.bindToBroker();

}) (UL.Broker);

