view.utils.validateInput = function (input) {
    var
        validators = {
            "not-empty": function (v) { return $.trim(v) !== ""; },
            "email"    : function (v) { return isEmail(v); }
        },

        $e              = $(input),
        validator       = $e.attr("data-validator"),
        errorMessage    = $e.attr("data-error"),
        value           = $e.val(),
        isValid         = validators[validator](value);


    if (!isValid && !$e.hasClass("error")) {
        $e.addClass("error");
        if (errorMessage)
            $e.after( $("<div />", { "text": errorMessage, "class": "error-message" }) );
    } else if (isValid) {
        $e.removeClass("error");
        $e.next(".error-message").remove();
    }

    return isValid;

};

