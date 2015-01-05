(function () {
    'use strict';
    // These methods are called from the app to open different dialogs

    // Prompt users to login
    ul.register('dialog.login', function(options){
        options || (options = { closeOnOverlay: true  });
        var dialog = new view.dialog.LoginModal(options);
        dialog.render();
    })

    // Prompt the user to register
    ul.register('dialog.signup', function (options) {
        //Should the dialog close when user clicks outside of it?
        options || (options = { closeOnOverlay: true });
        var dialog = new view.dialog.SignupModal(options);
        dialog.render();
    });

    // Prompt the user to register to continue the action
    ul.register('dialog.signupContinue', function (options) {
        //Should the dialog close when user clicks outside of it?
        options || (options = { closeOnOverlay: true });

        options.beta = true;

        var dialog = new view.dialog.SignupModal(options);
        dialog.render();
    });

    // Prompt anonymous users to login
    ul.register('dialog.requireLogin', function (options) {
        if (C.get("user").get("is_anonymous")) {
            ul.dialog.login(options);
            return true;
        }
    });

    // Prompt anonymous users to register
    ul.register('dialog.requireSignup', function (options) {
        if (C.get("user").get("is_anonymous")) {
            ul.dialog.signup(options);
            return true;
        }
    });

}) (typeof exports === 'undefined' ? this : exports);

