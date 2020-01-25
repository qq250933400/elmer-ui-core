var { elmerData} = require("./config/init");
var JSDOM = require("jsdom").JSDOM;
global.window = new JSDOM("").window;
global.document = window.document;
global.elmerData = elmerData;
global.NodeList = Array;
var describe = require("mocha").describe;
var assert = require("assert");
// var ElmerUI = require("../lib/core/ElmerUI");

describe("ElmerUI Render Test", () => {
    // var ui = new ElmerUI();
    // it("ElmerUI Render Exists test", () => {
    //     assert.equal(typeof ui.render, "function");
    // });
});
