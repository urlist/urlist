( function () {
    'use strict';

    // Ticker
    // ======
    //
    // A ticker collects messages, before sending them to Hyperdrive.
    // For some fun afternoon reading, see https://en.wikipedia.org/wiki/Nyquist%E2%80%93Shannon_sampling_theorem
    // Basically, it's a way to pack a lot of messages into one request. Imagine you send a hundred letters, 
    // then it's easier to get a package and have your hundred letter in there than to buy 200 post stamps, lick
    // them all and then feed the mailbox for an hour.
    //
    // Usage
    // -----
    //      var myTicker = new ul.Ticker({ threshold: 10000 });//Threshold is how often to check the amount of messages
    //      // Ticker provides the 'flush' event, to which we attach things we want to happen
    //      myTicker.on('flush', function (buffer) {console.log(buffer) });
    //      myTicker.push("Nyquist var klipsk!")
    //      myTicker.push("Nyquist var klipsk!")
    //      myTicker.push("Nyquist var klipsk!")
    //      // Now we wait until the threshold is done
    //      => ["Nyquist var klipsk!", "Nyquist var klipsk!", "Nyquist var klipsk!"]
    //
    //      // Note that the only method of Ticker you use is push, the other ones are for internal use

    var Ticker = function (options) {
        this.options = options;
        this.buffer = [];
        this.intervalId = null;
    };

    _.extend(Ticker.prototype, Backbone.Events, {

        // Add things to the ticker
        push: function (data) {
            // <threshold> ms from now, fire the flush event
            this.last = Date.now();
            this.buffer.push(data);

            if (!this.intervalId)
                this.intervalId = setInterval(
                    _.bind(this.check, this),
                    this.options.threshold / 2);
        },

        check: function () {
            if (Date.now() - this.last < this.options.threshold)
                return;

            clearInterval(this.intervalId);
            this.intervalId = null;
            this.flush();
        },

        flush: function () {
            this.trigger("flush", this.buffer);
            this.buffer = [];
        }

    });

    ul.register('Ticker', Ticker);

}) ();

