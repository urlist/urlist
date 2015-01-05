"use strict";

describe("Utilities", function () {
    it( "Transforms an array into an object", function () {
        var input = {"lists": ["qgp", "2ar"], "hashtag": "#foobar"};
        var expectedOutput = {"snopp": [ {"KoolKey": "qgp"}, {"KoolKey": "2ar"} ]};


        expect( ul.util.kato(input, "snopp", "KoolKey") ).toEqual(expectedOutput);
    })
})
