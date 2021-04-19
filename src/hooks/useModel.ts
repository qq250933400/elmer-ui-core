import { defineHook } from "./hookUtils";

export const useModel = <T>(Model: any):T => {
    return defineHook<T>("useModel", (opt):any => {
        if(opt.isInit) {
            opt.returnValue = new Model();
            opt.onDestory(() => {
                opt.returnValue = null;
            });
            return opt.returnValue;
        } else {
            return opt.returnValue;
        }
    });
};
