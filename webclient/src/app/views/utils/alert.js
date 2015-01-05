(function () {
    view.utils.displayAlert = function (message, type, defaultEl) {
        var k = 15,
            t = Math.max((message.length / 15) * 1000, 2500);

        defaultEl || (defaultEl = "message-alert");
        type || (type = "generic");

        var alertTmpl = '<div class="message {0} is--{1}">{2}</div>'.format(defaultEl, type, message);

        $("#urlist-content").append(alertTmpl);
        $("." + defaultEl).delay(t).fadeOut(500, function() { $(this).remove(); });
    };
}) ();
