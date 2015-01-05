( function (broker) {

    var UrlistAction = actions.Action.extend({

        events: {
            "add-contributor":      "addContributor",
            "remove-contributor":   "removeContributor"
        },

        addContributor: function (target, payload) {
            var contributorModel = new model.Contributor({ user_id: payload.user_id, status: "pending" }, { parse: true }),
                contributors = new ul.model.Urlist({ hash: target.list_hash }).get("contributors");

            contributors.add(contributorModel);
        },

        removeContributor: function (target, payload) {
            var contributorModel = new model.Contributor({ user_id: payload.user_id }),
                contributors = new ul.model.Urlist({ hash: target.list_hash }).get("contributors");

            contributors.remove(contributorModel);
        }

    });

    var urlistAction = new UrlistAction(broker);
    urlistAction.bindToBroker();

}) (UL.Broker);

