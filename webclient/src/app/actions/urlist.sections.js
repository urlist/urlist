( function (broker) {

    var UrlistAction = actions.Action.extend({

        events: {
            "update-sections": "updateSections",
            "add-section"    : "addSection",
            "remove-section" : "removeSection"
        },

        updateSections: function (target, payload) {
            var listModel = new ul.model.Urlist({ hash: target.list_hash }),
                sections = listModel.get("sections");


            _.each(payload.sections, function (s) {
                var sectionModel = sections.get(s.section_id);

                if (!sectionModel) {
                    sectionModel = new model.Section(s, {
                        urlist  : listModel,
                        urls    : listModel.get("urls"),
                        sections: sections });

                    sections.add(sectionModel);
                } else {
                    sectionModel.set(s);
                }
            });
        },

        addSection: function (target, payload, deferred) {
            var listModel = new ul.model.Urlist({ hash: target.list_hash }),
                sections = listModel.get("sections"),
                sectionModel = new model.Section(_.extend(payload, { position: sections.length + 1 }), {
                    urlist  : listModel,
                    urls    : listModel.get("urls"),
                    sections: sections });

            sections.add(sectionModel);

            deferred.done(function (payload) {
                sectionModel.set(payload);
            });
        },

        removeSection: function (target) {
            var listModel = new ul.model.Urlist({ hash: target.list_hash }),
                section   = listModel.get("sections").where({ section_id: target.section_id })[0],
                urls      = section.getLocalUrls();

            _.each(urls, function (url) {
                url.destroy();
            });

            section.destroy();
        }

    });

    var urlistAction = new UrlistAction(broker);
    urlistAction.bindToBroker();

}) (UL.Broker);

