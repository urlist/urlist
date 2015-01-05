// Dialog
// ======
// The base class for dialog views.
(function () {
    UL.DialogStack = [];

    UL.DialogStack.cleanAll = function () {
        _.each( _.clone(UL.DialogStack).reverse(), function (dialog) {
            dialog.unbindAll();
        });
    };


    Backbone.Dialog = ul.bbext.View.extend({

        events: function () {
            var base = {
                "click .js-dialog-close"             : "_cancel",
                "click .js-cancel"                   : "_cancel",

                "submit form"                        : "_submit",
                "keydown textarea"                   : "checkSubmit",
                "keyup textarea[data-count='chars']" : "countChars",

                "click .js-simple-textarea"          : "growTextarea",
                "click .js-for-clipboard"            : "selectForClipboard"
            };

            if (this.options.closeOnOverlay !== false)
                _.extend(base, {
                    "click .dialog-centering": "overlayCallback"
                });

            if (this.options.closeOnKey !== false)
                _.extend(base, {
                    "keyup .dialog-wrapper": "unbindAllByKey"
                });

            return _.extend(base, this.subevents);
        },

        subinitialize: function () {},

        initialize: function() {
            this.template = this.options.template || this.template;
            this.dialogTemplate = ul.util.t("utils/dialog");
            this.subinitialize();
        },

        getSource: function () {
            if (!this.options.sourceEvent)
                return {};

            return this.options.sourceEvent.getSource();
        },

        subrender: function() {
            if (this.model && this.model.toJSON)
                return $(this.template(this.model.toJSON({ calculated: true })));
            else
                return $(this.template());
        },

        render: function() {
            // Utility function to remove messages
            // They need to be gone when we render a dialog in the same space
            ul.view.util.clearMessages();

            if (this.options.standalone)
                UL.DialogStack.cleanAll();

            this.$el.html(this.dialogTemplate({dialog_class: this.dialogClass, is_wizard: this.options.isWizard}));

            $("#urlist-content")
                .append(this.$el)
                .addClass("dialog-placing");

            this.$(".js-dialog--hook").append(this.subrender());

            // Stop CSS animation the Dialog Stage
            if (this.options.skipAnimation) {
                this.$(".dialog-centering, .dialog-wrapper").addClass("dialog-animation--skip");
            }
            this.$(".dialog-wrapper").attr("tabindex","1").focus();

            this.documentScript();
            this.afterRender();

            UL.DialogStack.push(this);

            return this.$el;
        },

        unbindAll: function(e) {
            if(typeof e !== "undefined" && typeof e.preventDefault == "function")
                e.preventDefault();

            this.trigger("close");

            UL.DialogStack.pop();

            if (UL.DialogStack.length == 0)
                $("body").removeClass("dialog-placing");

            this.unbindMe();
        },

        unbindAllByKey: function(e) {
            if(e.keyCode == 27)
                this._cancel();
        },

        submit: function (e) {
            if (this.options.submit)
                this.options.submit(e);
        },

        afterRender: function () {
            // Ensure that the Dialog doesn't "slip" out of the window on top
            this.$(".dialog-centering").scrollTop(0);
        },

        cancel: function () {},

        _submit: function (e) {
            this.trigger("submit");
            this.submit(e) !== false && this.unbindAll();
            return false;
        },

        overlayCallback: function (e) {
            if ( $(e.target).is(".dialog-centering") ) {
                this._cancel();
            }
        },

        _cancel: function () {
            if (this.options.onlySubmit === true)
                return;

            this.trigger("cancel");
            this.cancel() !== false && this.unbindAll();

            return false;
        },

        toggleActions: function (active) {
            this.$(".js-cancel").toggleClass("inactive", !active);
            this.$("[type='submit']").toggleClass("inactive", !active);
        },

        documentScript: function () {},

        growTextarea: function (e) {
            var t = $(e.target),
                h = t.height(),
                d = 70;

            t.height(h+d).removeClass("js-simple-textarea");
        },

        selectForClipboard: function (e) {
            $(e.target).select();
        },

        checkSubmit: function (e) {
            if (e.ctrlKey && e.keyCode == 13) {
                this._submit();
            }
        },

        countChars: function (e) {
            var $me          = $(e.target),
                limitChars   = parseInt($me.attr("data-count-limit")),
                usedChars    = $me.val().length,
                totChars     = limitChars - usedChars,

                charsCounter = $("#" + $me.attr("rel"));

            charsCounter.html(totChars);

            if (totChars < 0) {
                charsCounter.addClass("alert-text");
                this.$("input[type='submit']").addClass("inactive");
            } else {
                charsCounter.removeClass("alert-text");
                this.$("input[type='submit']").removeClass("inactive");
            }

        }

    });
}) ();

