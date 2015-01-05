( function () {

    actions.Action = function (broker, options) {
        this.broker = broker;
        this.options = options;
    };

    _.extend(actions.Action.prototype, Backbone.Events, {
        bindToBroker: function () {
            for (var e in this.events)
                this.listenTo(this.broker, e, this[this.events[e]]);
        }
    });

    actions.Action.extend = Backbone.View.extend;

}) ();

