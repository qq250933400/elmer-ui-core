import { getModelObj } from "../decorators/Autowired";
import { defineHook } from "./hookUtils";

export const useModel = <T>(Model: new(...args: any[]) => T):T => {
    return defineHook<T>("useModel", (opt):any => {
        if(opt.isInit) {
            opt.returnValue = getModelObj(Model);
            opt.onDestory(() => {
                opt.returnValue = null;
            });
            return opt.returnValue;
        } else {
            return opt.returnValue;
        }
    });
};
