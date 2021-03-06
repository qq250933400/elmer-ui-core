import { StaticCommon as utils } from "elmer-common";
import { ARenderMiddleware, TypeRenderMiddlewareEvent } from "../middleware/ARenderMiddleware";
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
    isInit: boolean;
    hookIndex: number;
    store: undefined | null | T;
    onEffect?: (callback: TypeOnEffectEvent) => void;
    onDestory?: (callback: Function) => void;
    setState: (state: any, refresh?: boolean) => Promise<any>;
};
type TypeDefineHookCallback<T> = (options: TypeDefineHookCallbackOptions<T>) => T;

export const defineHook = <T>(hookName: string, callback: TypeDefineHookCallback<T>, override?: boolean): T => {
    const hookIndexKey = `${hookName}Index`;
    const hookStore = <TypeHookStore>getWikiState("hookStore");
    const componentObj = <any>getWikiState("_this");
    const renderObj = <any>getWikiState("_renderObj");
    let hookIndex = <any>getWikiState(hookIndexKey);
    if(["useState", "useCallback", "useComponent", "useEffect", "getNode"].indexOf(hookName) >= 0 && !override) {
        throw new Error(`The hook name to define is a system reserved name that is not allowed.(${hookName})`);
    }
    if(!hookStore) {
        throw new Error(`[${hookName}] Something went wrong!!!`);
    }
    if(isNaN(hookIndex)) {
        hookIndex = 0;
    }
    if(!hookStore[hookName]) {
        hookStore[hookName] = {};
    }
    if(!hookStore[hookName][hookIndex]) {
        const hookData = callback({
            component: componentObj,
            hookIndex,
            isInit: true,
            render: renderObj,
            store: hookStore[hookName][hookIndex],
            // tslint:disable-next-line: object-literal-sort-keys
            onEffect: (effectCallback: any): void => {
                if(!componentObj["$hookEffects"]) {
                    componentObj["$hookEffects"] = [];
                }
                if(!componentObj["$hookEffects"][hookIndex]) {
                    componentObj["$hookEffects"][hookIndex] = effectCallback;
                }
            },
            onDestory: (destoryCallback: Function): void => {
                if(!componentObj["$hookDestory"]) {
                    componentObj["$hookDestory"] = [];
                }
                if(!componentObj["$hookDestory"][hookIndex]) {
                    componentObj["$hookDestory"][hookIndex] = destoryCallback;
                }
            },
            setState: (state:any, refresh?: boolean): Promise<any> => {
                return componentObj.setState(state, refresh);
            }
        });
        hookStore[hookName][hookIndex] = hookData || {};
        setWikiState(hookIndexKey, hookIndex + 1);
        return hookData;
    } else {
        callback({
            component: componentObj,
            hookIndex,
            isInit: false,
            render: renderObj,
            store: hookStore[hookName][hookIndex],
            // tslint:disable-next-line: object-literal-sort-keys
            setState: (state:any, refresh?: boolean): Promise<any> => {
                return componentObj.setState(state, refresh);
            }
        });
        setWikiState(hookIndexKey, hookIndex + 1);
        return hookStore[hookName][hookIndex];
    }
};
