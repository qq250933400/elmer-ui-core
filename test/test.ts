import { HtmlParse } from "../src";

let htmlParse = new HtmlParse();

let result = htmlParse.parse("<a title='aaa' et:click='ttts' class.active='title eq mapping'>");

console.log(result);

// todo: How to write the unit test script
// todo: 2、Need translate news