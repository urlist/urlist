( function () {

    function deferredWrapper(template, data) {
        var deferred = $.Deferred();

        return deferred;
    }

    UL.Embed = function (json) {
        var url  = json.url,
            host = parseUri(url).host
                    .replace(/^www\./, '')
                    .replace(/\./, ''),
            deferred;

        try {
            for (var e in embed)
                if (host.indexOf(e) != -1) {
                    return embed[e](json);
                }
        } catch (exc) {
            console.error("Error embeddig resource", url, exc);

        }
        deferred = $.Deferred();

        if (json.embed_handler == "unsupported")
            deferred.resolve(ul.util.t("embed/__not_embeddable")(json));
        else
            deferred.resolve(ul.util.t("embed/iframe")(json));

        return deferred;
    };


    _.extend(embed, {
        "vimeo": function (data) {
            var r = /https?:\/\/(?:www\.)?vimeo.com\/(?:channels\/|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?|#)/;
                m = r.exec(data.url),
                deferred = $.Deferred();

            data = _.extend(data, { video_id: m[3] });

            deferred.resolve( ul.util.t("embed/vimeo")(data) );

            return deferred;
        },

        "youtube": function (data) {
            var getStart = function (url) {
                    var match = /(\d+)m(\d+)s/.exec(getURLParameter(data.url, 't'));
                    if (match) {
                        return parseInt(match[1]) * 60 + parseInt(match[2]);
                    }
                    return 0;
                },
                r = /(v=|\/)([\w-]+)(&.+)?$/,
                m = r.exec(data.url),
                deferred = $.Deferred(),

            data = _.extend(data, { video_id: m[2], start: getStart(data.url) });

            deferred.resolve( ul.util.t("embed/youtube")(data) );

            return deferred;
        },

        "soundcloud": function (data) {
            var deferred = $.Deferred(),
                endpoint = "http://soundcloud.com/oembed?url={0}&format=js".format(encodeURIComponent(data.url));

            $.ajax({ url: endpoint, dataType: "jsonp", timeout: 3000 })
                .done(function (soundcloudData) {
                    data = _.extend(data, soundcloudData);
                    deferred.resolve( ul.util.t("embed/soundcloud")(data) );
                })
                .fail(function () {
                    deferred.resolve(ul.util.t("embed/__not_embeddable")(data));
                });

            return deferred;
        },

        "amazon": function (data) {
            var target = "{0}/embed?url={1}".format(API_ROOT, encodeURIComponent(data.url)),
                deferred = $.Deferred();

            $.ajax({ url: target, dataType: "json" })
                .done(function (remote) {
                    remote.formatted_author = remote.authors.join(", ");
                    data.remote = remote;
                    deferred.resolve( ul.util.t("embed/amazon")(data) );
                })
                .fail(function () {
                    deferred.reject();
                });

            return deferred;
        }
    });
}) ();
