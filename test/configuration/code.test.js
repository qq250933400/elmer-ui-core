var describe = require("mocha").describe;
var assert = require("assert");

describe("Testting typescript 3.7 support", () => {
    it("optional call attribute", () => {
        const a = {};
        assert.equal(a.title, undefined);
    });
});
