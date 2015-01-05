function uuid() {
    // http://stackoverflow.com/a/2117523/597097
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16); });
}


// http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format/4256130#4256130
// author: Filipiz
String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{'+i+'\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

String.prototype.toTitleCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

String.prototype.crop = function (len) {
    if (this.length > len)
        return this.substr(0, len) + "…";
    else
        return this;
};

Date.prototype.toUTCISOString = function () {
    return JSON.parse(JSON.stringify(new Date()));
};

/* For a given date, get the ISO week number
 *
 * Based on information at:
 *
 *    http://www.merlyn.demon.co.uk/weekcalc.htm#WNR
 *
 * Algorithm is to find nearest thursday, it's year
 * is the year of the week number. Then get weeks
 * between that date and the first day of that year.
 *
 * Note that dates in one year can be weeks of previous
 * or next year, overlap is up to 3 days.
 *
 * e.g. 2014/12/29 is Monday in week  1 of 2015
 *      2012/1/1   is Sunday in week 52 of 2011
 */
Date.prototype.getCohort = function () {
    var d, yearStart, weekNo, quarter;

    // Copy date so don't modify original
    d = new Date(this);
    d.setHours(0,0,0);

    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));

    // Get first day of year
    yearStart = new Date(d.getFullYear(), 0, 1);

    // Calculate full weeks to nearest Thursday
    weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1) / 7);
    weekNo = weekNo < 10 ? "0" + weekNo : "" + weekNo;

    // Calculate quarter
    quarter = parseInt(d.getMonth() / 3) + 1;

    return "{0}{1}".format(d.getFullYear(), weekNo);
};


function isEmail(s) {
    return s.split("@").length == 2 && s.split(".").length > 1;
}


// http://stackoverflow.com/a/8764051/597097
function getURLParameter(url, name, fallback) {
    fallback = fallback === undefined ? null : fallback;
    var param, parser;

    switch(typeof fallback) {
        case "boolean"  : parser = function (v) { return v === "true"; }; break;
        case "number"   : parser = function (v) { return parseInt(v); }; break;
        default         : parser = function (v) { return v; };
    }

    param = decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(url)||["",""])[1].replace(/\+/g, '%20'));
    if (parser && param.length > 0)
        return parser(param);
    return fallback;
}

function getLocationParameter(name, fallback) {
    return getURLParameter(location.search, name, fallback);
}

function setDocumentTitle (title) {
    // Regexp rule
    var regex  = /^(\().+?(\)) /g,
    // Take the pre-existent prefix
        prefix = document.title.match(regex),
    // Default title
        title  = title;

    // Override default title if (prefix)
    if (prefix) {
        // Add the previous prefix
        title = prefix + title;
    }

    // http://bugs.jquery.com/ticket/7825
    $(document).attr("title", title + " — Urlist");
}

function setNotifCountDocumentTitle (n) {
    // Current title
    var title    = document.title,
    // Regexp rule
        regex    = /^(\().+?(\)) /g,
    // Check if (n) exists
        replaced = title.search(regex) >= 0,
    // Instance a micro-template for (n)
        nTmpl    = "";
    // Set a micro-template for (n)
    if (n > 0) {
        if (n > 9) {
            nTmpl = "(9+) ";
        } else {
            nTmpl = "("+n+") ";
        }
    }

    // Override previous title
    if (replaced) {
        title = title.replace(regex, nTmpl);
    } else {
        title = nTmpl + title;
    }

    // Set new document title
    document.title = title;
}

function slugify(val, prefix) {
    prefix || (prefix = "");

    if (val) {
        val = $.trim(val);

        if (prefix)
            val = prefix + " " + val;

        return val
            .toLowerCase()
            .replace(/[^\w ]+/g,'')
            .replace(/ +/g,'-');
    }
}

function normalizeUrl(url) {
    var relative;

    url = $.trim(url);

    if (!url.match(/^.*:\/\/.+/)) url = "http://" + url;
    relative = parseUri(url).relative;

    if (!relative) url = url + "/";

    return url;
}


// http://stackoverflow.com/a/179514 + http://stackoverflow.com/a/8769106/597097
function deleteAllCookies() {
    var cookies = document.cookie.split(";");

    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        var eqPos = cookie.indexOf("=");
        var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=.urli.st";
    }
}



function isScrolledIntoView(elem) {
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();

    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();

    return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom)
      && (elemBottom <= docViewBottom) &&  (elemTop >= docViewTop) );
}

function addParamToUrl(fullurl, key, val) {
    // XXX should add encodeURIComponent

    var tokens   = fullurl.split("#"),
        url      = tokens[0],
        fragment = tokens[1];

    if (url.indexOf("?") == -1) {
        url = "{0}?{1}={2}".format(url, key, val);
    } else {
        url = "{0}&{1}={2}".format(url, key, val);
    }

    if (fragment)
        url = [url, fragment].join("#");

    return url;
}

