(function ($) {
 
    $.fn.tooltip = function(options) {
 
        var pluginName = "tooltip",
            defaults = {
                type     : "standard", // values [standard|fancy|alone], standard: is the default style, fancy: with some graphics, alone: tooltip without the arrow
                text     : "none",     // custom text for all text should be always declared
                origin   : "body",     // where to append the tooltip. "body" is recommended
                position : "top",      // values [top|right|bottom|left], is applied globally but not where [data-position] is specified
                distance : 4,          // default distance factor for the tooltip from the triggering element
                debug    : false,      // activate some debugging info
                selector : "[data-tooltip]"
            };
         
        // initialize default options
        var options = $.extend(defaults, options);
     
        return this.each(function() {

            var el = $(document),
                elSel = defaults.selector;

            el.on("mouseenter", elSel, function (e) {

                $(this).each(function() {

                    var defaultTitle = $(this).attr("title");

                    $(this).on("mouseleave", function () {
                        // Restores previous [title] if present
                        $(this).attr("title", defaultTitle);
                        // Destroy other left .tooltip elements
                        $(".tooltip").remove();
                    });

                    // Avoid possible overlap between [title] and Tooltip Plugin
                    $(this).removeAttr("title");

                    var tooltipText = defaultTitle || $(this).attr("data-text") || defaults.text,
                        tooltipTmpl = "<div class='tooltip is--{0}'>{1}</div>".format(defaults.type, tooltipText);

                    $(tooltipTmpl).appendTo(defaults.origin);

                    var tooltip  = $(".tooltip"),
                        tooltipW = tooltip.outerWidth(),
                        tooltipH = tooltip.outerHeight(),

                        elW      = $(this).outerWidth(),
                        elH      = $(this).outerHeight(),

                        elPos    = $(this).data("position") || defaults.position,
                        elPosX   = $(this).offset().left,
                        elPosY   = $(this).offset().top,

                        k        = defaults.distance;

                        // Write text in the Tooltip
                        tooltip.text(tooltipText);

                    switch(elPos) {
                        case "bottom":
                            tooltip.css({
                                "left"       : elPosX - ( ( tooltipW - elW ) / 2 ) + "px",
                                "top"        : elPosY + elH + "px",
                                "margin-top" : ( elH / k ) + "px"
                            }).attr("data-position", elPos);
                        break;
                        case "left":
                            tooltip.css({
                                "left"         : elPosX - tooltipW + "px",
                                "top"          : elPosY - ( ( tooltipH - elH ) / 2 ) + "px",
                                "margin-right" : ( tooltipW / k ) + "px"
                            }).attr("data-position", elPos);
                        break;
                        case "right":
                            tooltip.css({
                                "left"         : elPosX + elW + "px",
                                "top"          : elPosY - ( ( tooltipH - elH ) / 2 ) + "px",
                                "margin-left" : ( elW / k ) + "px"
                            }).attr("data-position", elPos);
                        break;
                        default:
                            tooltip.css({
                                "left"       : elPosX - ( ( tooltipW - elW ) / 2 ) + "px",
                                "top"        : elPosY  - tooltipH + "px",
                                "margin-top" : - ( elH / k ) + "px"
                            }).attr("data-position", elPos);
                    }

                    // Tooltip debug
                    if (defaults.debug == true) {
                        console.log("Tooltip:", "x", elPosX, "y", elPosY, "w", tooltipW, "h", tooltipH, "Text:", tooltipText);
                    }

                });
            });
     
        });

        // return this;
    };

})(jQuery);
