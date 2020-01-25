require("colors");
require("../lib/profil/string.profill");
var StaticBuilder = require("../lib/builder").StaticBuilder;
var config = process.env.npm_config_argv;
var strType = Object.prototype.toString.call(config);
var path = require("path");
var fs = require("fs");
if(strType === "[object String]" && config.length>0) {
    var configData = JSON.parse(config);
    var origins = configData.original;
    var cmd = origins[0] || "";
    switch(cmd) {
        case "static": {
            var srcPath = path.resolve("./src");
            var desPath = path.resolve("./lib");
            var obj = new StaticBuilder(fs,srcPath, desPath);
            obj.run();
            break;
        }
        default: {
            console.log('[err]    不支持的操作命令'.red); 
        }
    }
} else {
    console.log('[err]    未指定操作命令。。。'.red);
}

