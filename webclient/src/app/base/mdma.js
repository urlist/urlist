// Thank you to:
// http://code.google.com/p/pagedown/source/browse/Markdown.Converter.js
// https://github.com/wycats/handlebars.js/blob/master/lib/handlebars/utils.js

function mdma(text, parseHashtags) {

    var escape = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "`": "&#x60;"
    };

    var badChars = /[&<>"'`]/g;
    var possible = /[&<>"'`]/;

    var escapeChar = function(chr) {
        return escape[chr] || "&amp;";
    };

    function safe(text) {
        if (text == null || text === false)
            return "";

        if(!possible.test(text))
            return text;

        return text.replace(badChars, escapeChar);
    }

    function detab(text) {
        if (!/\t/.test(text))
            return text;

        var spaces = ["    ", "   ", "  ", " "],
        skew = 0,
        v;

        return text.replace(/[\n\t]/g, function (match, offset) {
            if (match === "\n") {
                skew = offset + 1;
                return match;
            }
            v = (offset - skew) % 4;
            skew = offset + 1;
            return spaces[v];
        });
    }

    function attributeEncode(text) {
        // unconditionally replace angle brackets here -- what ends up in an attribute (e.g. alt or title)
        // never makes sense to have verbatim HTML in it (and the sanitizer would totally break it)
        return text.replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    }


    function doAnchors(text) {
        text = text.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g, writeAnchorTag);
        text = text.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\]\([ \t]*()<?((?:\([^)]*\)|[^()\s])*?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g, writeAnchorTag);
        text = text.replace(/(\[([^\[\]]+)\])()()()()()/g, writeAnchorTag);
        return text;
    }

    var _problemUrlChars = /(?:["'*()[\]:]|~D)/g;

    function encodeProblemUrlChars(url) {
        if (!url)
            return "";

        var len = url.length;

        return url.replace(_problemUrlChars, function (match, offset) {
            if (match == "~D") // escape for dollar
            return "%24";
        if (match == ":") {
            if (offset == len - 1 || /[0-9\/]/.test(url.charAt(offset + 1)))
            return ":";
        }
        return "%" + match.charCodeAt(0).toString(16);
        });
    }

    function escapeCharacters(text, charsToEscape, afterBackslash) {
        // First we have to escape the escape characters so that
        // we can build a character class out of them
        var regexString = "([" + charsToEscape.replace(/([\[\]\\])/g, "\\$1") + "])";

        if (afterBackslash) {
            regexString = "\\\\" + regexString;
        }

        var regex = new RegExp(regexString, "g");
        text = text.replace(regex, escapeCharacters_callback);

        return text;
    }

    function escapeCharacters_callback(wholeMatch, m1) {
        var charCodeToEscape = m1.charCodeAt(0);
        return "~E" + charCodeToEscape + "E";
    }

    function writeAnchorTag(wholeMatch, m1, m2, m3, m4, m5, m6, m7) {
        if (m7 == undefined) m7 = "";
        var whole_match = m1;
        var link_text = m2.replace(/:\/\//g, "~P"); // to prevent auto-linking withing the link. will be converted back after the auto-linker runs
        var link_id = m3.toLowerCase();
        var url = m4;
        var title = m7;

        if (url == "") {
            if (link_id == "") {
                // lower-case and turn embedded newlines into spaces
                link_id = link_text.toLowerCase().replace(/ ?\n/g, " ");
            }
            url = "#" + link_id;

            if (whole_match.search(/\(\s*\)$/m) > -1) {
                // Special case for explicit empty url
                url = "";
            } else {
                return whole_match;
            }
        }
        //url = encodeProblemUrlChars(url);
        url = escapeCharacters(url, "*_");

        var result;

        if (url.substring(0, 1) == "/") {
            result = "<a class=\"js-navigate\" href=\"" + url + "\"";
        } else {
            result = "<a target=\"_blank\" href=\"" + url + "\"";
        }

        if (title != "") {
            title = attributeEncode(title);
            title = escapeCharacters(title, "*_");
            result += " title=\"" + title + "\"";
        }

        result += ">" + link_text + "</a>";

        return result;
    }


    text = safe(text);
    text = text.replace(/~/g, "~T");
    text = text.replace(/\$/g, "~D");

    text = "\n\n" + text + "\n\n";
    text = detab(text);

    text = text.replace(/^[ \t]+$/mg, "");

    text = text.replace(
        /([\W_]|^)(\*\*|__)(?=\S)([^\r]*?\S[\*_]*)\2([\W_]|$)/g,
        "$1<em>$3</em>$4");

    text = text.replace(
        /([\W_]|^)(\*|_)(?=\S)([^\r\*_]*?\S)\2([\W_]|$)/g,
        "$1<strong>$3</strong>$4");

    text = doAnchors(text);

    text = text.replace(/(^|\s)(https?|ftp)(:\/\/[-A-Z0-9+&@#\/%?=~_|\[\]\(\)!:,\.;]*[-A-Z0-9+&@#\/%=~_|\[\]])($|\W)/gi, "$1<$2$3>$4");

    var replacer = function (wholematch, m1) { return "<a href=\"" + m1 + "\">" + m1 + "</a>"; };
    var hashtag  = function (wholematch, m1) { return "<a class='js-navigate' href=\"/hashtag/" + m1.toLowerCase() + "\">#" + m1 + "</a>"; };

    text = text.replace(/<((https?|ftp):[^'">\s]+)>/gi, replacer);

    if (parseHashtags) {
        text = text.replace(/#(\w+)/gi, hashtag);
    }

    text = text.slice(2, -2);

    text = text.replace(/~D/g, "$$");
    text = text.replace(/~T/g, "~");

    return text;
}

