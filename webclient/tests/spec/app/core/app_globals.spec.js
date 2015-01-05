// This suite tests the app_global file. 
// It also serves as a template, or a reference for when you are writing future tests.
"use strict";

describe("App Globals", function () {
    it("registers things in the global ul namespace", function () {
        var makeAnythingCredible = function (input) { return input+"!!!"; }
        ul.register('util.myCoolNamespacedFunction', makeAnythingCredible);
        expect( ul.util.myCoolNamespacedFunction( "hello" ) ).toBe("hello!!!");
    })
})
