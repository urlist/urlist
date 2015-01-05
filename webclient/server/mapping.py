from utils.resources import *

##
# Styles
#

class UrlistStyles(LessRegion):
    mapping = (
        ('styles/pixbakery-custom.less',  LessResource), # <-- REMEMBER the comma!
    )

##
# Core libraries to stand on the shoulder of the giants
#
class UrlistLibs(JavascriptRegion):
    mapping = (
        ('app/base/log.js',         JavascriptResource),
        ('libs/core/modernizr.custom.js', JavascriptResource),
        ('libs/trackers/ga.js',     JavascriptResource),
        ('libs/trackers/mixpanel.js',JavascriptResource),
        ('libs/core/jquery.js',     JavascriptResource),
        ('libs/core/underscore.js', JavascriptResource),
        ('libs/core/backbone.js',   JavascriptResource),
        ('libs/core/handlebars.js', JavascriptResource),
        ('libs/extras',             JavascriptResourceSet),
    )

##
# Our mad shitz, dawg!
#
class UrlistAppLibs(JavascriptRegion):
    mapping = (
        ('app/core/app_globals.js',         JavascriptResource),
        ('app/base/ticker.js',              JavascriptResource),
        ('app/core/bbext',                  JavascriptResourceSet),
        ('app/core/dialog.js',              JavascriptResource),
        ('app/core/util.js',                JavascriptResource),
        ('app/base/ie-shit.js',             JavascriptResource),
        ('app/base/utils.js',               JavascriptResource),
        ('app/base/utils_date.js',          JavascriptResource),
        ('app/base/base.js',                JavascriptResource),
        ('app/base/underscore_extension.js',JavascriptResource),
        ('app/base/dialog.js',              JavascriptResource),
        ('app/base/handlebars_helpers.js',  JavascriptResource),
        ('app/base/jquery_event_extension.js',JavascriptResource),
        ('app/base/event_originator_helpers.js',JavascriptResource),
        ('app/base/mdma.js',                JavascriptResource),
        ('app/base/embed.js',               JavascriptResource),
        ('app/base/social_helpers.js',      JavascriptResource),
        ('app/base/action.js',              JavascriptResource),
        ('app/core/broker.js',              JavascriptResource),

        ('app/templates',       HandlebarsResourceSet),
        ('app/models',          JavascriptResourceSet),
        ('app/collections',     JavascriptResourceSet),
        ('app/views',           JavascriptResourceSet),
        ('app/routers',         JavascriptResourceSet),
        ('app/actions',         JavascriptResourceSet),
        ('app/policies',        JavascriptResourceSet),
        ('app/main',            JavascriptResourceSet),
    )


##
# All Urlist resources BUT app.js
#
class UrlistResources(Region):
    mapping = (
        ('.',  UrlistStyles),
        ('.',  UrlistLibs),
        ('.',  UrlistAppLibs),
    )

##
# Urlist AppLibs and app.js
#
class UrlistApp(JavascriptRegion):
    mapping = (
        ('.',                   UrlistAppLibs),
        ('app/app.js',          JavascriptResource),
    )

##
# Urlist AppLibs and app.js
#
class UrlistAll(JavascriptRegion):
    mapping = (
        ('.',  UrlistLibs),
        ('.',  UrlistAppLibs),
        ('app/app.js',  JavascriptResource),
    )


##
# APPLICATIONS
#
class UrlistDev(Region):
    mapping = (
        ('app/config.dev.js',     JavascriptResource),
        ('.',                     UrlistResources),
        ('libs/core/less.min.js', JavascriptResource),
        ('app/app.js',            JavascriptResource),
    )


class UrlistConfigProd(Region):
    mapping = (
        ('app/config.prod.js',     JavascriptResource), # REMEMBER THE F*CKING COMMA
    )


class UrlistProd(Region):
    mapping = (
        ('/static/builds/config.prod.min.js',JavascriptResource),
        ('/static/builds/libs.min.js',  JavascriptResource),
        ('/static/builds/app.min.js',   JavascriptResource),
        ('/static/builds/styles.css',   CssResource),
    )



regions = {
    'config': UrlistConfigProd,
    'libs'  : UrlistLibs,
    'app'   : UrlistApp,
    'all'   : UrlistAll,
    'styles': UrlistStyles
}


def build(args):
    Region = regions[args.region]
    region = Region(args.root, args.root, virtualroot='/static')
    print region.as_text().encode('utf-8')


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Fapp management tool.')
    parser.add_argument('--root', default='../src', help='change root')

    subactions = parser.add_subparsers(help='Sub actions help')

    parser_build = subactions.add_parser('build')
    parser_build.add_argument('region', choices=regions.keys())

    parser_build.set_defaults(func=build)

    args = parser.parse_args()
    args.func(args)

