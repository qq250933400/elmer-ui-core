import { StaticCommon as utils } from "elmer-common";
import { getGlobalState, setGlobalState } from "../init/globalUtil";

export const HOOKS_USE_STATE_SSID = "USE-EFFECT-d5603e60-632c-a1ac-06c1-dc45569f";

export const useState = (StaticComponentOptions:any, defaultState?: any) => {
    const instance = StaticComponentOptions.instance;
    let useStateHook = {
        hooks: [],
        index: 0
    };
    let stateValue, setStateCallback;
    if(!StaticComponentOptions || StaticComponentOptions.useStateSSID !== HOOKS_USE_STATE_SSID) {
        throw new Error("useState只能在函数组件使用并且需要传递函数组件第二个参数");
    }
    if(!instance.useState) {
        Object.defineProperty(instance, "useState", {
            configurable: false,
            enumerable: false,
            value: useStateHook,
            writable: false
        });
    } else {
        useStateHook = instance.useState;
    }
    const currentStateIndex = useStateHook.index;
    const stateKey = "hook_" + currentStateIndex;
    let currentState = useStateHook.hooks[currentStateIndex];
    if(currentState) {
        setStateCallback = currentState.setState;
    } else {
        currentState = ((obj, dValue) => {
            const stateData = obj.state || {};
            stateData[stateKey] = dValue;
            obj.state = stateData;
            return {
                getState: ():any => {
                    return utils.getValue(obj.state, stateKey);
                },
                setState: (state:any) => {
                    const updateState = {};
                    updateState[stateKey] = state;
                    utils.setValue(obj.state, stateKey, state);
                    return obj.setState(updateState, true);
                }
            };
        })(instance, defaultState);
        setStateCallback = currentState.setState;
        useStateHook.hooks.push(currentState);
    }
    useStateHook.index += 1;
    return ["state." + stateKey, setStateCallback, currentState.getState];
};
