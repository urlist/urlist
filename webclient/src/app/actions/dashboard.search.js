( function (broker) {

    var DashboardAction = actions.Action.extend({

        events: {
            "add-saved-search":   "addSearch",
            "remove-saved-search": "removeSearch"
        },

        addSearch: function (target, payload, deferred) {
            var query = payload.query;

            deferred.done( function (payload) {
                var searchModel = new model.SavedSearch({
                        search_id: payload.search_id,
                        query: query
                    }),
                    searchesCollection = C.get("user").get("saved_searches");

                searchesCollection.add(searchModel);
                view.utils.displayAlert("Search saved!", "info");
            });
        },

        removeSearch: function (target, payload) {
            var searchModel = new model.SavedSearch({ search_id: target.search_id });

            searchModel.destroy();
        }

    });

    var dashboardAction = new DashboardAction(broker);
    dashboardAction.bindToBroker();

}) (UL.Broker);

