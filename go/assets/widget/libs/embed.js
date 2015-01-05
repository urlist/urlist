// usage:
// <blockquote class="urlist-list" id="[hash]">...</blockquote>

// Get first .urlist-list element in the page
(function () {
    var DIV_STYLE  = ["overflow: hidden;",
                      "padding: 0;",
                      "margin: 0 auto 20px;",
                      "display: block;",
                      "width: 100%;",
                      "max-width: 620px;",
                      "height: 320px;",
                      "border: 1px solid #d9d9d9;",
                      "box-shadow: 0 1px 3px rgba(188,188,188,0.25);",
                      "border-radius: 3px;",
                      "-moz-box-sizing: border-box;",
                      "-webkit-box-sizing: border-box;",
                      "box-sizing: border-box;",
                      "-webkit-background-clip: border-box;" ].join(""),

        IFRAME_STYLE=["background-color: transparent;",
                      "width: 100%;",
                      "margin: 0 auto",
                      "padding: 0;",
                      "border: 0;",
                      "height: 100%"].join(""),

        matching    = document.querySelectorAll(".urlist-list"),
        domain, listId, iframeSrc, dynamicTmpl, staticTmpl;

    for (var i = 0; i < matching.length; i++) {
        staticTmpl  = matching[i];
        domain      = staticTmpl.getElementsByTagName("a")[0].href.split("/").slice(0, -1).join("/");
        listId      = staticTmpl.id.split("-")[1];
        iframeSrc   = domain + "/widget/" + listId;
        dynamicTmpl = document.createElement("div");

        dynamicTmpl.innerHTML = '<div id="list-widget-' + listId + '" style="' + DIV_STYLE + '"><iframe style="' + IFRAME_STYLE + '" src="' + iframeSrc + '"></iframe></div>';

        staticTmpl.parentNode.insertBefore(dynamicTmpl, staticTmpl.nextSibling);
        staticTmpl.parentNode.removeChild(staticTmpl);
    }

}) ();

