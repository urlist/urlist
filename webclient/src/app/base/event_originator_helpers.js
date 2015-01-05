( function () {

    var NavigationExtras = function () {
        this.lastExtras = null;
    };


    _.extend(NavigationExtras.prototype, Backbone.Events, {

        push: function (extras) {
            this.lastExtras = extras;
        },

        pop: function () {
            var extras = this.lastExtras;
            this.lastExtras = null;
            return extras;
        }

    });

    UL.EventOriginator = new NavigationExtras();

}) ();

