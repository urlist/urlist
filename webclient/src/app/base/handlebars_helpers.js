//
// Handlebars Helpers
// ==================
// These methods are nifty helpers for Handlebars

Handlebars.registerHelper("hostify", function(val) {
    var parsed = parseUri(val);

    return parsed.host.replace(/^www\./, '');
});

Handlebars.registerHelper("highlight", function(terms, text) {
    var safeText = Handlebars.Utils.escapeExpression(text);

    for (var i = 0, term = terms[0]; i < terms.length; term = terms[++i])
        safeText = safeText.replace(new RegExp("({0}\\w*)".format(term), "gi"), "<span class='highlight'>$1</span>");

    return new Handlebars.SafeString(safeText);
});

Handlebars.registerHelper("onoff", function(val, comp, what) {
    return val ? "on" : "off";
});

Handlebars.registerHelper("prettydate", function(val) {
    return ul.util.prettydate(val, true);
});

Handlebars.registerHelper("slugify", function(val) {
    return slugify(val);
});

Handlebars.registerHelper("decodeURIComponent", function(val) {
    return decodeURIComponent(val);
});

Handlebars.registerHelper("titlecase", function(val) {
    return val.toTitleCase();
});

Handlebars.registerHelper("toLowerCase", function (val) {
    return (!!val && typeof val === 'string') ? val.toLowerCase() : '';
});

Handlebars.registerHelper("normalizeUrl", function(val) {
    return normalizeUrl(val);
});

Handlebars.registerHelper("or", function(val, alternative) {
    return val ? val : alternative;
});

Handlebars.registerHelper("show-if", function(val) {
    if (!val) {
        return "hide";
    }
});

Handlebars.registerHelper("if-equal", function(a, b, options) {
    return a == b ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("if-not-equal", function(a, b, options) {
    return a != b ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("hide-if", function(a, b) {
    if (b === undefined) {
        if (a)
            return "hide";
    } else if (a == b) {
        return "hide";
    }
});

Handlebars.registerHelper("hide-if-gt", function(a, b) {
    if (b === undefined) {
        if (a)
            return "hide";
    } else if (a > b) {
        return "hide";
    }
});

Handlebars.registerHelper("len", function(val) {
    if (val)
        return val.length;
});

Handlebars.registerHelper("crop", function(val, length) {
    if (val)
        return val.crop(length);
});

Handlebars.registerHelper("if-length-gt", function(val, length, options) {
    return val && val.length > length ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("appendiftrue", function(val, what) {
    if (val) {
        return what;
    }
});

Handlebars.registerHelper("appendiffalse", function(val, what) {
    if (!val) {
        return what;
    }
});

Handlebars.registerHelper("appendif", function(val, comp, what) {
    if (val == comp) {
        return what;
    }
});

Handlebars.registerHelper("appendifnot", function(val, comp, what) {
    if (val != comp) {
        return what;
    }
});

Handlebars.registerHelper("selectedif", function(val, comp) {
    if(val == comp) {
        return "selected";
    }
});

Handlebars.registerHelper("checkedifeq", function(value, comp) {
    if (_.isArray(value))
        return _.any( _.map(value, function (v) { return v == comp; }) ) ? "checked" : "";

    if(value == comp) return "checked";
});

Handlebars.registerHelper("checkediffalse", function(value) {
    if(!value) return "checked";
});

Handlebars.registerHelper("checkedif", function(value) {
    if (value) return "checked";
});

Handlebars.registerHelper("pluralize", function (amount, singular) {
    // This helper takes a word, matches it against a list, and if it finds
    // then it returns the appropriate word. Inglese macaroni & swenglish yo. 
    if (singular === "link" && amount === 1) {
        return "link";
    } else if (singular === "link") {
        return "links";
    }
});

Handlebars.registerHelper("plural", function(value) {
    if (value == 0 || value > 1) return "s";
});

Handlebars.registerHelper("randomize", function(options) {
    var options = options || 0,
        number = Math.floor(Math.random()*options) + 1;

    return "randomize-" + number;
});

Handlebars.registerHelper("CURRENT", function(model, attribute) {
    return C.get(model).get(attribute);
});

Handlebars.registerHelper("IF-NEWBIE", function(options) {
    return C.get("user").getMyListsCount() == 1 ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("IF-ADMIN", function(options) {
    return C.get("user").get("__notrack") ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("LOGGED", function(options) {
    return !C.get("user").get("is_anonymous") ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("ANON", function(options) {
    return C.get("user").get("is_anonymous") ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("NOT-LOGGED", function(options) {
    return C.get("user").get("is_anonymous") ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("A-GROUP", function(options) {
    return C.get("user").ABGroup() == "A" ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("B-GROUP", function(options) {
    return C.get("user").ABGroup() == "B" ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("ENABLED", function(permissions, options) {
    var has = C.get("user").get("__permissions") || [],
        req = permissions.split(","),
        adm = C.get("user").get("__notrack"),
        can = _.some(_.map( has, function (h) { return req.indexOf(h) != -1; } ));

    return can || adm ? options.fn(this) : options.inverse(this);
});

