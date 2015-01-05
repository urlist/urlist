// Helper to bind events to a specific source.
//
// Usage: add `data-source` to add a readable source for an event.
//
// Can be used to track any kind of event.
// At the moment, it is used to track the source of a page view,
// or the source of some specific events, such as `follow` and `bookmark`.
//
// The goal is to have an easy way to understand what are the best and
// worst sources of specific events.
//
// The cool thing about traversing the DOM backward, looking for a defined
// attribute, is that we can delegate to the container the definition of the
// `source`. If we want to track how much the "list bookmarking" is effective
// on the sidebar, we just need to define once the `data-source` attribute,
// right in the sidebar container.


( function () {

    _.extend(jQuery.Event.prototype, {

        // When an event is fired, this helper exposes a new method called
        // `getSource`. The method traverse the DOM looking for the first node
        // containing the attribute `data-source`.
        getSource: function () {
            var source = $(this.target).closest("[data-source]").attr("data-source");

            // If the node is found, the method returns an hash containing the value of
            // the attribute.
            if (source)
                return { source: source };

            // Otherwise an empty hash is returned
            else
                return {};

        }

    });

}) ();

