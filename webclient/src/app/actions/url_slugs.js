( function (broker) {

    var MyAction = actions.Action.extend({

        events: {
            "update-list": "updateList",
            "view-list": "viewList",
            "view-url" : "viewUrl"
        },

        updateList: function (target, payload, deferred) {
            var listModel;
            listModel = new ul.model.Urlist({ hash: target.list_hash });

            deferred.done(function (data) {
                if (data.slug)
                    UL.Router.navigate("/" + data.slug, { replace: true });
            });

        },

        viewList: function (listModel) {
            var params = window.location.href.split("?")[1];

            listModel.whenReady().done(function () {
                var url = "/{0}".format(listModel.get("slug"));
                if (params) url = [url, params].join("?");
                UL.Router.navigate(url, { replace: true });
            });
        },

        viewUrl: function (listModel, urlModel) {
            var params = window.location.href.split("?")[1];

            listModel.whenReady().done(function () {
                var url = "/{0}/{1}".format(listModel.get("slug"), urlModel.get("slug"));
                if (params) url = [url, params].join("?");
                UL.Router.navigate(url, { replace: true });
            });
        }

    });

    var myAction = new MyAction(broker);
    myAction.bindToBroker();

}) (UL.Broker);

