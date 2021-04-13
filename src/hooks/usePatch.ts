import { TypeContextStoreCreateResult } from "../context/contextStore";
import { defineHook } from "./hookUtils";

export const usePatch = (name: string, callback?: Function): TypeContextStoreCreateResult | null | undefined => {
    return defineHook("usePatch", (opt) => {
        if(opt.isInit) {
            if(!opt.component.context || !opt.component.context[name]) {
                // 定义Name不存在，callback必须设置
                if(opt.hookIndex > 1) {
                    throw new Error("usePatch只允许定义一次");
                }
                if(typeof callback === "function") {
                    opt.component.$getContext = ((id,fn) => {
                        return (copt) => {
                            return {
                                data: fn(),
                                name: id
                            };
                        };
                    })(name, callback);
                }
                return null;
            } else {
                return opt.component.context[name];
            }
        } else {
            return opt.component.context ? opt.component.context[name] : null;
        }
    });
};
