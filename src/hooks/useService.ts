import { getServiceObj } from "../decorators/Autowired";
import { defineHook } from "./hookUtils";

export const useService = <T>(Service: new (...args:any[]) => any):T => {
    return defineHook("useService", (opt) => {
        if(opt.isInit) {
            opt.returnValue = getServiceObj(Service);
            return opt.returnValue;
        } else {
            return opt.returnValue;
        }
    });
};
