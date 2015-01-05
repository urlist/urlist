(function () {
    'use strict';

    var displayMessage = function (html) {
        var $el = $(html);
        $("#urlist-content").append($el);
        $el.find(".js-message-close").on("click", function () { $el.remove(); return false; });
    };
    ul.register('view.util.displayMessage', displayMessage);

    var clearMessages = function () {
        $(".message-alert").remove();
    };
    ul.register('view.util.clearMessages', clearMessages);

    // view.utils.displayMessage
}) ();
