( function (broker) {

    var MyAction = actions.Action.extend({

        events: {
            "all": "log"
        },

        log: function () {
            console.log("EVENT", arguments);
        }

    });

    var myAction = new MyAction(broker);
    //myAction.bindToBroker();

}) (UL.Broker);

