import { ValidationProvider } from "elmer-validation";
import { defineGlobalState, getGlobalState } from "../../index";

/**
 * 重新定义Validation state
 */
ValidationProvider.overrideInit(() => {
    if(!getGlobalState("ValidationState")) { // 防止重复初始化，导致已有state丢失
        const defineState = {};
        ValidationProvider.defineReadonlyProperty(defineState, "context", {});
        ValidationProvider.defineReadonlyProperty(defineState, "validators", {});
        defineGlobalState("ValidationState", defineState);
    }
});

ValidationProvider.overrideGetState(() => {
    return getGlobalState("ValidationState");
});

/**
 * 初始化validation state
 */
export const validationInit = () => {
    // ValidationProvider.init();
};

export default {
    validationInit
};
