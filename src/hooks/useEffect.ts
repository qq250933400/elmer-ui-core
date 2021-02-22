import { getWikiState, setWikiState, TypeHookStore } from "./hookUtils";

export const useEffect = (callback: Function): void => {
    const componentObj = <any>getWikiState("_this");
    const hookStore = <TypeHookStore>getWikiState("hookStore");
    const hookIndex = <any>getWikiState("useEffectIndex");
    if(!hookStore) {
        throw new Error("[useEffect] Something went wrong!!!");
    }
    if(!hookStore.useEffect[hookIndex]) {
        if(typeof callback !== "function") {
            throw new Error("[useEffect] the argument of callback is not a function.");
        }
        hookStore.useEffect[hookIndex] = {
            callback,
            destoryCallback: null
        };
        if(typeof componentObj.$unMount !== "function") {
            componentObj.$unMount = () => {
                // tslint:disable-next-line: forin
                for(const fKey in hookStore.useEffect) {
                    try {
                        const fn = hookStore.useEffect[fKey];
                        typeof fn === "function" && fn();
                    } catch (e) {
                        // tslint:disable-next-line: no-console
                        console.error(e);
                    }
                }
            };
        }
        componentObj["$useEffect"] = callback;
    }
    setWikiState("useEffectIndex", hookIndex + 1);
};
