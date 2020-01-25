var describe = require("mocha").describe;
var assert = require("assert");
var HtmlParse = require("../../lib/virtualDom/index").HtmlParse;
// var htmlParse = require("../../src/virtualDom/htmlParse").HtmlParse;
var htmlParse = new HtmlParse();

describe("Html代码解析类测试", () => {
    var result = htmlParse.parse("<a title='aaa' et:click='ttts' class.active='title eq mapping'>");
    describe("注释标签解析<!--test comment-->", () => {
        var result = htmlParse.parse("<!--test comment-->");
        it("标签代码解析测试", () => {
            assert.equal(typeof result, "object");
            assert.equal(result.children.length, 1);
        });
        it("标签属性解析测试", () => {
            assert.equal(Object.keys(result.children[0].props).length, 0);
        });
        it("标签内容解析测试", () => {
            assert.equal(result.children[0].innerHTML, "test comment");
        });
    });
    describe("img标签解析测试<img src='aa.jpg'/>",()=>{
        var result = htmlParse.parse("<img src='aa.jpg'/>");
        it("标签代码解析测试", () => {
            assert.equal(typeof result, "object");
            assert.equal(result.children.length, 1);
        });
        it("标签属性[src]解析测试", () => {
            assert.equal(result.children[0].props.src, "aa.jpg");
        });
    });
    describe("无属性标签测试<a>test</a>", () => {
        var result = htmlParse.parse("<a>test</a>");
        it("标签代码解析测试", () => {
            assert.equal(typeof result, "object");
            assert.equal(result.children.length, 1);
        });
        it("标签属性解析测试", () => {
            assert.equal(Object.keys(result.children[0].props).length, 0);
        });
        it("text标签解析测试", () => {
            assert.equal(Object.keys(result.children[0].children[0].props).length, 0);
            assert.equal(result.children[0].children[0].tagName, "text");
        });
        it("text标签内容解析测试", () => {
            assert.equal(result.children[0].children[0].innerHTML, "test");
        });
    });
    describe("ul标测试", () => {
        var result = htmlParse.parse(`<ul class="abs"><li><a>test item 1<i>aabb</i></a></li><li><a>test item2</a></li></ul>`);
        var dom = result.children[0];
        it("代码解析完整测试", () => {
            assert.equal(typeof dom, "object");
            assert.equal(dom.children.length, 2);
        });
        it("li标签解析测试", () => {
            assert.equal(dom.children[0].tagName, "li");
            assert.equal(dom.children[1].tagName, "li");
        });
        it("a标签解析测试", () => {
            assert.equal(dom.children[0].children[0].tagName, "a");
            assert.equal(dom.children[1].children[0].tagName, "a");
        });
        it("text标签解析测试", ()=>{
            assert.equal(dom.children[0].children[0].children[0].tagName, "text");
        });
        it("text标签内容解析测试", ()=>{
            assert.equal(dom.children[0].children[0].children[0].innerHTML, "test item 1");
        });
        describe("i标签解析测试", () => {
            it("标签解析测试", ()=>{
                assert.equal(dom.children[0].children[0].children[1].tagName, "i");
            });
            it("标签内容解析测试", ()=>{
                assert.equal(dom.children[0].children[0].children[1].children[0].innerHTML, "aabb");
            });
        });
    });
});