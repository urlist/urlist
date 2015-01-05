(function() {
    var Model = Backbone.Model.extend({

        //Setter function with integers
        inc: function (key, val, options) {
            if ( typeof val === "undefined" )
                val = 1;

            return this.set(key, this.get(key) + val, options);
        },

        update: function(key, func, options) {
            return this.set(key, func(this.get(key)), options);
        },

        // You should define this when you extend ul.bbext.Model and
        // use yourModel.whenReady().
        isReady: function () {
            throw "isReady is not defined in your Model extension";
        },

        // whenReady
        // ---------
        //  whenReady will provide you with a Deferred, to which other's
        // can attach callbacks to. In that way, other functions can
        // execute when the model is considered ready.
        //
        // ### Example
        // src/app/models/urlist.js's extension defines isReady as
        //     return this.has("urls");
        //
        // So when it's whenReady is called, the deferred resolves. 
        // Good job.
        whenReady: function () {
            var that = this;

            if (this._deferred)
                return this._deferred;

            this._deferred = $.Deferred();

            if (this.isReady()) {
                this._deferred.resolve();
            } else {
                this.fetch({
                    success: function () { that._deferred.resolve(); },
                    error  : function () {
                        console.error("Error loading resource.", that.url(), that);
                        that._deferred.reject(); 
                    }
                });
            }

            return this._deferred;
        }
    });
    ul.register('bbext.Model', Model)
}) ();

(function() {
    var View = Backbone.View.extend({

        initialize: function () {
            this.template = this.options.template;
        },

        render: function() {
            if (this.model) {
                this.$el.html(this.template(this.model.toJSON()));
            } else {
                this.$el.html(this.template());
            }

            return this.$el;
        },

        _unbindMe: function () {
        },

        unbindMe: function() {
            this._unbindMe();
            this.undelegateEvents();
            this.$el.removeData().unbind();
            this.$el.remove();
            this.stopListening();
        }

    });

    ul.register('bbext.View', View)
}) ();


(function() {
    var Collection = Backbone.Collection;

    // Moves a model to the given index, if different from its current index. Handy
    // for shuffling models about after they've been pulled into a new position via
    // drag and drop.
    //
    // * https://gist.github.com/insin/3619992

    Collection.prototype.move = function(model, toIndex) {
        var fromIndex = this.indexOf(model);

        if (fromIndex == -1)
            throw new Error("Can't move a model that's not in the collection");

        if (fromIndex !== toIndex)
            this.models.splice(toIndex, 0, this.models.splice(fromIndex, 1)[0]);

        this.trigger("move");
    };
    ul.register('bbext.Collection', Collection)
}) ();


(function () {
    var calculated_extras = {

        calculated: function(func, key, context) {
            if (context)
                func = _.bind(func, context);

            this.calculatedAttributes || (this.calculatedAttributes = {});

            this.calculatedAttributes[key] = func;
        },

        toJSON: function(options) {
            options || (options = {});

            var json = Backbone.Model.prototype.toJSON.call(this);

            if (options.calculated)
                for(var k in this.calculatedAttributes)
                    try {
                        json[k] = this.calculatedAttributes[k]();
                    } catch (e) { }

            return json;
        }

    };

    _.extend(ul.bbext.Model.prototype, calculated_extras);

}) ();

