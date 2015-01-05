( function () {
    if (!window.console) {
        window.console = {};
        window.console.log = window.console.debug = window.console.info = window.console.warning = window.console.error = function () {};
    }

    var types = ["debug", "info", "warning", "error"];
    for (var i = 0; i < types.length; i++) {
        if (typeof window.console[types[i]] === "undefined")
            window.console[types[i]] = window.console.log;
    }

}) ();

