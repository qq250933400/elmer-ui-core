import { autoInit } from "../injectable";
import { defineHook } from "./hookUtils";
import { TypeAutowiredOptions } from "../injectable/createClassFactory";

export const useService = <T>(Service: new (...args:any[]) => any, options?: string | TypeAutowiredOptions):T => {
    return defineHook("useService", (opt) => {
        if(opt.isInit) {
            opt.returnValue = autoInit(Service, options);
            return opt.returnValue;
        } else {
            return opt.returnValue;
        }
    });
};
