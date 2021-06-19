import utils from "../lib/utils";
import { defineHook } from "./hookUtils";

export const useOnce = <T={}>(initState: T, stateKey?: string,): T => {
    return defineHook("useOnce", (opt): any => {
        if(opt.isInit) {
            const initData = typeof initState === "function" ? initState() : initState;
            opt.returnValue = initData;
            if(!utils.isEmpty(stateKey)) {
                const newState = opt.component.state || {};
                newState[stateKey] = initData;
                opt.component.state = newState;
            }
            return initData;
        } else {
            return opt.returnValue;
        }
    });
};
