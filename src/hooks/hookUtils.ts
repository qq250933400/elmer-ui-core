import { utils } from "elmer-common";
import { Component } from "../component";
import { ARenderMiddleware, TypeRenderMiddlewareEvent } from "../middleware/ARenderMiddleware";
import renderActions from "../render/ElmerRenderAction";
export type TypeHookStore = {
    useState: any;
    useCallback: any;
    useComponent: any;
    useEffect: any;
    getNode: any;
};

export const wikiState: any = {};

export const getWikiState = <T>(key: string): T => {
    const missionId = wikiState["missionId"];
    const missionObj = wikiState[missionId];
    return missionObj ? missionObj[key] : null;
};

export const setWikiState = (key: string, value:any): void => {
    const missionId = wikiState["missionId"];
    let missionObj = wikiState[missionId];
    if(!missionObj) {
        missionObj = {};
        wikiState[missionId] = missionObj;
    }
    utils.setValue(missionObj, key, value);
};

export const getCurrentMissionId = (): string => {
    return wikiState["missionId"];
};

type TypeOnEffectEvent = (name: keyof ARenderMiddleware, options: TypeRenderMiddlewareEvent) => void;
type TypeDefineHookCallbackOptions<T> = {
    component: any;
    render: any;
    returnValue?: any;
    isInit: boolean;
    hookIndex?: number;
    store: any;
    Factory: Function|Component;
    onEffect?: (callback: TypeOnEffectEvent) => void;
    onDestory?: (callback: Function) => void;
    setState: (state: any, refresh?: boolean) => Promise<any>;
    getHookStore(hookName: string): any[];
};
type TypeDefineHookCallback<T> = (options: TypeDefineHookCallbackOptions<T>) => T;

export const defineHook = <T>(hookName: string, callback: TypeDefineHookCallback<T>, override?: boolean): T => {
    const currentDispatchState = renderActions.getCurrentRenderDispatch();
    if(!currentDispatchState?.isFunc) {
        throw new Error("hook函数只能用于函数组件，不允许使用if等嵌套。");
    }
    if(!currentDispatchState || !currentDispatchState.hookState) {
        throw new Error("hook函数只能用于函数组件内部。");
    }
    let hookIndex = currentDispatchState.hookState.hookIndex;
    hookIndex += 1;
    const hookStore = currentDispatchState.hookState.state;
    if(!hookStore[hookIndex]) {
        const hookOptions:any = {
            component: currentDispatchState.component,
            hookIndex,
            isInit: true,
            name: hookName,
            store: null,
            // tslint:disable-next-line: object-literal-sort-keys
            Factory: currentDispatchState.Factory,
            // tslint:disable-next-line: object-literal-sort-keys
            getHookStore: (name: string) => {
                const myHookStore: any[] = [];
                Object.values(hookStore).forEach((hookObj: any) => {
                    hookObj.name === hookName && myHookStore.push(hookObj);
                });
                return myHookStore;
            },
            onEffect: ((com)=> {
                return (useCallbackX:Function) => {
                    if(!com["$hookEffects"]) {
                        com["$hookEffects"] = [];
                    }
                    com["$hookEffects"].push(useCallbackX);
                };
            })(currentDispatchState.component)
        };
        const hookData = callback(hookOptions);
        hookOptions.returnValue = hookData;
        hookStore[hookIndex] = hookOptions;
        currentDispatchState.hookState.hookIndex = hookIndex;
        return hookData;
    } else {
        const saveStore = hookStore[hookIndex];
        const hookData = callback({
            ...saveStore,
            isInit: false
        });
        currentDispatchState.hookState.hookIndex = hookIndex;
        return hookData;
    }
};
