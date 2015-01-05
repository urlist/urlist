(function (w) {
    var _deltaMillis;
    var _serverDate;

    var ULDate = function (s, parse) {
        this.raw = s;

        if (parse)
            this.parse(s);
    };

    ULDate.sync = function () {
        _deltaMillis = new Date().getTimezoneOffset() * 6e4;

        $.getJSON(API_ROOT + "datetime")
            .done(function (s) {
                var oldDelta   = _deltaMillis,
                    serverDate = new ULDate(s.now),
                    delta      = new Date().getTime() - serverDate.getTime();

                console.log("Delta is", delta);

                _serverDate  = serverDate;
                _deltaMillis = delta;
            });
    };

    ULDate.prototype.getTime = function () {
        if (!this.date)
            this.parse();

        return this.date.getTime();
    };

    ULDate.prototype.parse = function (s) {
        var i, tokens, parsed;

        this.raw = s || this.raw;

        for (i = 0, tokens = this.raw.split(/[-T:.]/), parsed = [0, 0, 0, 0, 0, 0];
             i < Math.min(tokens.length, parsed.length);
             parsed[i] = parseInt(tokens[i]), i++);
        
        // looks stupid but using .apply with `new` is a mess
        this.date = new Date(parsed[0], parsed[1] - 1, parsed[2], parsed[3], parsed[4], parsed[5]);
    };

    ULDate.prototype.getDelta = function (uldate) {
        date = uldate || new ULDate();
        var delta = this.getTime() - date.getTime() + _deltaMillis;
        return parseInt(delta / 1000);
    };

    w.ULDate = ULDate;
}) (window);

