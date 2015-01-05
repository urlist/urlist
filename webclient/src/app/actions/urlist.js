//###The Actions are callbacks that are fired when a message happens
( function (broker) {

    var UrlistAction = actions.Action.extend({

        //Define the mappings between actions and what functions to run
        //They are fired when `UL.Broker.push()` is fired.
        events: {
            "view-list":            "viewList",
            "update-list":          "updateList",
            "update-list-cover":    "updateListCover",
            "update-categories":    "updateCategories",
            "add-url":              "addUrl",
            "remove-url":           "removeUrl",
            "update-url":           "updateUrl",
            "fetch-url-data":       "fetchUrlData",
            "check-list":           "checkList",
            "move-url":             "moveUrl",
            "relist-url":           "relistUrl",
            "add-comment":          "addComment",
            "remove-comment":       "removeComment",
            "move-url-to-another-list": "moveUrlToAnotherList"
        },

        moveUrlToAnotherList: function (target, payload, deferred, extras) {
            // example call
            // UL.Broker.push("move-url-to-another-list", { from_list: {list_hash: "8kd", url_hash: "9s4" }, to_list: { list_hash: "93s"} })
            deferred
                .done(function (returnedData) {
                    var urls = new ul.model.Urlist({
                        hash: target.from_list.list_hash
                    }).get("urls");
                    var urlModel = urls.where({ hash: target.from_list.url_hash })[0];
                    //Set model in target list
                    var toUrlist = new ul.model.Urlist({
                        hash: target.to_list.list_hash
                    });
                    var targetListCollection = toUrlist.get("urls");

                    targetListCollection.add(urlModel);

                    urls.remove(urlModel);

                    urlModel.set(returnedData);
                });
        },

        viewList: function (urlistModel) {
            urlistModel.set("last_visit", new Date().toUTCISOString());
        },

        updateList: function (target, payload, deferred) {
            var listModel = new ul.model.Urlist({ hash: target.list_hash });

            listModel.set( payload );
        },

        updateListCover: function (target, payload) {
            var listModel = new ul.model.Urlist({ hash: target.list_hash });
            listModel.whenReady().done(function () {
                listModel.set("cover_image", payload.cover_image);
            });
        },

        updateCategories: function (target, payload, deferred) {
            var listModel = new ul.model.Urlist({ hash: target.list_hash });

            listModel.set("categories", payload.categories);

            deferred.done(function () {
                view.utils.displayAlert("Changes saved", "confirm");
            });
        },

        addUrl: function (target, payload, deferred) {
            var urlist = new ul.model.Urlist({ hash: target.list_hash }),
                urls = urlist.get("urls"),
                position = payload.position || 1,
                urlModel;

            payload._status = "load";
            payload.list_hash = target.list_hash;

            urlModel = new ul.model.Url(payload, { parse: true, collection: urls });
            urls.add(urlModel, { at: position - 1, merge: true });

            deferred
                .done( function (payload) {
                    payload = _.purge(payload, null);
                    delete payload.position;

                    urlModel.set(payload);
                    urlModel.set("_status", "ok");
                })
                .fail( function (payload) {
                    urlModel.destroy();
                    if (payload == "UrlExists") {
                        view.utils.displayAlert("That link is already in the list!");
                    } else {
                        view.utils.displayAlert("Something went wrong! Are you sure it was a link? Try again", "error");
                    }
                });

        },

        fetchUrlData: function (target, payload, deferred) {
            // XXXXXX ERROR
            var list, urls, url;

            list = new ul.model.Urlist({ hash: target.list_hash });

            if (!list.isReady()) return;

            urls = list.get("urls");
            url = urls.where({ hash: target.url_hash })[0] || urls.where({ __request_id: requestId })[0];

            deferred.done( function (payload) {
                url.set( payload );
            });
        },

        updateUrl: function (target, payload, deferred) {
            var urls = new ul.model.Urlist({ hash: target.list_hash }).get("urls"),
                url = urls.where({ hash: target.url_hash })[0];

            url.set( payload );
        },

        moveUrl: function (target, payload) {
            var urls        = new ul.model.Urlist({ hash: target.list_hash }).get("urls"),
                url         = urls.where({ hash: target.url_hash })[0],
                position    = payload.position;

            url.set(payload);
            urls.move(url, position - 1);
        },

        removeUrl: function (target) {
            var urls = new ul.model.Urlist({ hash: target.list_hash }).get("urls"),
                url = urls.where({ hash: target.url_hash })[0];

            url.destroy();
        },

        checkList: function (target, payload, deferred) {
            var urlistModel = new ul.model.Urlist({ hash: target.list_hash });

            console.debug("[actions.urlist]\t",
                "List {0} is {1}ms old, checking".format(urlistModel.id, urlistModel.age()));

            deferred.done( function (payload) {
                // reset the list `age`
                urlistModel.age(true);

                if (!_.isEmpty(payload)) {
                    console.debug("[actions.urlist]\t", "Got new data for list", urlistModel.id);
                    urlistModel.set(urlistModel.parse(payload));
                    UL.Router.list(urlistModel, true);
                } else {
                    console.debug("[actions.urlist]\t", "List {0} is updated".format(urlistModel.id));
                }
            });
        },

        relistUrl: function (target, payload, deferred) {
            deferred.done(function () {
                var that = this;
                var fromUrlistModel = new ul.model.Urlist({ hash: payload.from_list_hash });
                fromUrlistModel.whenReady().done(function(){
                    var fromUrlModel = fromUrlistModel.get("urls").where({ hash: payload.from_url_hash })[0];
                    fromUrlModel.inc("relist_amount");
                });
            });
        },

//        addComment: function (target, payload, deferred) {
//            var urlistModel = new ul.model.Urlist({ hash: target.list_hash }),
//                comments    = urlistModel.get("comments"),
//                commentModel = new ul.model.Comment(payload, { parse: true });
//
//            comments.unshift(commentModel);
//
//            deferred.done( function (payload) {
//                commentModel.set({
//                    comment_id: payload.comment_id
//                });
//            });
//        },

//        removeComment: function (target, payload, deferred) {
//            var urlistModel = new ul.model.Urlist({ hash: target.list_hash }),
//                comments    = urlistModel.get("comments"),
//                commentModel = comments.where({ comment_id: target.comment_id })[0];
//
//            commentModel.destroy();
//        }

    });

    var urlistAction = new UrlistAction(broker);
    urlistAction.bindToBroker();

}) (UL.Broker);

