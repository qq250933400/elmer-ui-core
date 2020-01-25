import "../profil/string.profill";

export const initGlobalVars = ()=> {
    if(window && (!(<any>window)["elmerData"] || !(<any>window)["elmerData"]["version"])) {
        // 在项目中只初始化一次全局数据
        (<any>window)["elmerData"] = {
            $console: console,
            auther: "Elmer S J Mo",
            bindTempVars: {},
            classPool: [],
            components: {},
            elmerState: {},
            objPool: [],
            resizeListeners: {},
            routers: [],
            title: "elmerUI",
            version: "2.0.0",
            ...((<any>window)["elmerData"] || {})
        };
    }
    window["Promise"] = Promise;
    // ----
    if(!window["_babelPolyfill"]) {
        require("babel-polyfill");
        window["_babelPolyfill"] = true;
    }
};

initGlobalVars();
