( function () {
    // When you want to get an already existing url model, you unforturnately can not
    // simply do new ul.model.Url({ list_hash: "keo", hash: "ps0" }). 
    // You need to have a urlistModel. When that is_ready, you can do
    // urlistModel.get("urls").where({ hash: "ps0" })[0]
    // Remember that and you won't have to spend a couple of hours trying to figure it out!
    // Over and out.
    UrlModel = ul.bbext.Model.extend({
        idAttribute: "hash",

        defaults: {
            title: "Untitled link"
        },

        parseDefaults: function () {
            return {
                user_id: C.get("user").get("user_id"),
                title: "Loading...",
                creation_time: new Date().toUTCISOString()
            };
        },

        initialize: function (attributes, options) {
            this.listenTo(this.collection, "add delete destroy move", this.updatePosition);

            this.calculated(this.getCid, "cid", this);
            this.calculated(this.getPolicies, "policies", this);
            this.calculated(this.getListHash, "list_hash", this);
            this.calculated(this.htmlDescription, "html_description", this);
            this.calculated(this.getHost, "host", this);
            this.calculated(this.isUpdated, "is_updated", this);
            this.calculated(this.timeAgo, "time_ago", this);
            this.calculated(this.prettyDate, "pretty_date", this);
        },

        htmlDescription: function () {
            return mdma(this.get("description"));
        },

        updatePosition: function () {
            // We need to check if the model still has a collection,
            // maybe we are in the callback of the model just removed

            if (this.collection)
                this.set("position", this.collection.indexOf(this) + 1);
        },

        getCid: function () {
            return this.cid;
        },

        getPolicies: function () {
            return helpers.generatePolicy("urlist", C.get("user"), this.getUrlist());
        },

        getFullUrl: function () {
            return "/{0}/{1}".format(this.getUrlist().get("hash"), this.get("hash"));
        },

        getHost: function () {
            var parsed = parseUri(this.get("url"));

            return parsed.host.replace(/^www\./, '');
        },

        getUrlist: function () {
            return new ul.model.Urlist({ hash: this.getListHash() });
        },

        getListHash: function () {
            return this.get("list_hash");
        },

        needsFavicon: function () {
            return this.has("hash") && !this.get("favicon");
        },

        isUpdated: function () {
            return this.timeAgo() > -60;
        },

        prettyDate: function () {
            var ct     = new Date(this.get("creation_time")).getTime(),
                now    = new Date().getTime(),
                offset = (now - ct) / 1000,
                unit   = "s";

            // Pyramid code is waiting for Maya
            if (offset > 60) {
                offset /= 60;
                unit = "m";

                if (offset > 60) {
                    offset /= 60;
                    unit = "h";

                    if (offset > 24) {
                        offset /= 24;
                        unit = "d";
                        if (offset > 60) {
                            offset = null;
                        }
                    }

                }
            }

            if (offset)
                return "{0}{1}".format(parseInt(offset), unit);
            else
                return "time";
        },

        timeAgo: function () {
            var ct, lv, me, delta;

            ct = this.get("creation_time");
            lv = this.getUrlist().get("last_visit");
            me = this.get("user_id") == C.get("user").get("user_id");

            if (me || !ct || !lv) return;

            ct = new Date(ct);
            lv = new Date(lv);

            delta = parseInt((ct.getTime() - lv.getTime()) / 1e3);

            return delta;
        },

        isReady: function () {
            return true;
        },

        parse: function (response) {
            _.defaults(response, _.result(this, "parseDefaults"));

            var user_id = response.user_id;

            response.title = _.get(response, "title");
            if (response.title == "") response.title = null;
            response.description = _.get(response, "description") || "";
            response.author = new model.User({ user_id: user_id });

            if (response.from_user_id) {
                response.relistedFromAuthor = new model.User({ user_id: response.from_user_id });
            }

            return response;
        },

        fullUrl: function () {
            return UL.config.origin + "/{0}/{1}".format(this.get("list_hash"), this.get("hash"));
        },

        toTweet: function() {
            var url = this.fullUrl(),
                settings = this.get("settings");

            var charleft = 140 - url.length + 2;
            var head = this.get("title");

            if (head.length > charleft) {
                // 1 for the ellipsis
                head = this.get("title").substr(0, charleft - 1) + "…";
            }

            return '"{0}" {1}'.format(head, url);
        }

    });

    ul.register('model.Url', UrlModel);
}) ();

