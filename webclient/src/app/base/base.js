var
    // Urlist global objects
    UL = {
        config: {
            hyperdrive: {}
        },
        tests: {
            utils: {}
        }
    },

    main = {},
    mustacheTemplate = {},

    view = {
        urlist: {},
        utils: {},
        dialog: {},
        discovery: {},
        dashboard: {},
        widget: {},
        navigation: {},
        suggestion: {},
        message: {},
        search: {}
    },
    model = {},
    collection = {
        urlists: {}
    },

    embed = {},

    router = {},

    testdata = {},

    actions = {},

    policies = {},

    helpers = {};


var API_ROOT = API_ROOT || '',
    C = new ul.bbext.Model;

//This is a deprecated function. Use ul.util.t instead.
//T was used to generate the templates.
function T(name) {
    console.error("Using deprecated function T. Use ul.util.t");
    return TEMPLATES[name];
}

$.ajaxSetup({
    xhrFields: { withCredentials: true }
});

// UL.config.environment = $.cookie("ul.config.environment");

UL.config.origin = window.location.protocol + "//" + window.location.host;
UL.config.sections_limit = 12;

// XXX: should be refactored one day
UL.CATEGORIES = {
    "51837d3e1caceef887c30478": { position: 0,  label: "Information & Media", slug: "information-media" },
    "51837d3e1caceef887c30476": { position: 1,  label: "Education",           slug: "education" },
    "51837d3e1caceef887c3047c": { position: 2,  label: "Society & Politics",  slug: "society-politics" },
    "51837d3e1caceef887c30479": { position: 3,  label: "Business",            slug: "business" },
    "51837d3e1caceef887c3047d": { position: 4,  label: "Passions & Hobbies",  slug: "passions-hobbies" },
    "51837d3e1caceef887c3047b": { position: 5,  label: "Cooking",             slug: "cooking" },
    "51837d3e1caceef887c3047e": { position: 6,  label: "Culture & Arts",      slug: "culture-arts" },
    "51837d3e1caceef887c30477": { position: 7,  label: "Science & Nature",    slug: "science-nature" },
    "51837d3e1caceef887c3047a": { position: 8,  label: "Activism",            slug: "activism" },
    "51837d3e1caceef887c30475": { position: 9,  label: "Technology",          slug: "technology" },
    "51837d3e1caceef887c3047f": { position: 10, label: "Controversial",       slug: "controversial" },
    "520900d3ed92b7ad01e9ab5b": { position: 11, label: "Places",              slug: "places" }
};

UL.ORDERED_CATEGORIES = _.chain(UL.CATEGORIES).map(function (v, k) { v.id = k; return v; }).sortBy("position").value();

// fix Facebook awful callback
if (window.location.hash == '#_=_')
    window.location.hash = '';

