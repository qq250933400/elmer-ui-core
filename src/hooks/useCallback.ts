import { StaticCommon as utils } from "elmer-common";
import { getWikiState, setWikiState, TypeHookStore } from "./hookUtils";

type TypeUseCallbackHookOptions = {
    arguments?: any[]; // protect arguments, 设置以后只有当参数有变化时才会执行
    initValue?: any;
    name?: string; // 不为空时将callback绑定到Component对象上
};

type TypeUseCallback = <T>() => T;

export const useCallback = (callback: Function, options?: TypeUseCallbackHookOptions): [any, TypeUseCallback] => {
    const componentObj = <any>getWikiState("_this");
    const hookStore = <TypeHookStore>getWikiState("hookStore");
    const hookIndex = <any>getWikiState("useCallbackIndex");
    if(!hookStore) {
        throw new Error("[useState] Something went wrong!!!");
    }
    if(!hookStore.useCallback[hookIndex]) {
        const callbackHook:any = ((obj:any, store: TypeHookStore, stateIndex: any, attrName: string, myCallback: Function): Function => {
            // tslint:disable-next-line: only-arrow-functions
            const newCallback =  function():any {
                const hookStoreObj = store.useCallback[stateIndex];
                const args = hookStoreObj.arguments || [];
                const newArgs = arguments;
                if(args && args.length > 0) {
                    let hasChange = false;
                    if(newArgs.length !== args.length) {
                        hasChange = true;
                    } else {
                        // tslint:disable-next-line: forin
                        for(const key in args) {
                            const arg = args[key];
                            if(!utils.isEqual(arg, newArgs[key])) {
                                hasChange = true;
                                break;
                            }
                        }
                    }
                    if(hasChange) {
                        const myResult = myCallback.apply(obj, newArgs);
                        store.useCallback[stateIndex].value = myResult;
                        store.useCallback[stateIndex].arguments = newArgs;
                        return myResult;
                    } else {
                        return hookStoreObj.value;
                    }
                } else {
                    const myResult = myCallback.apply(obj, newArgs);
                    store.useCallback[stateIndex].value = myResult;
                    return myResult;
                }
            };
            if(!utils.isEmpty(attrName)) {
                obj[attrName] = newCallback;
            }
            return newCallback;
        })(componentObj, hookStore, hookIndex, options?.name, callback);
        hookStore.useCallback[hookIndex] = {
            arguments: options?.arguments,
            callback: callbackHook,
            value: options?.initValue
        };
        setWikiState("useCallbackIndex", hookIndex + 1);
        return [options?.initValue, callbackHook];
    } else {
        setWikiState("useCallbackIndex", hookIndex + 1);
        return [hookStore.useCallback[hookIndex].value, hookStore.useCallback[hookIndex].callback];
    }
};
