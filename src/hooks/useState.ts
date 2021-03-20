import { defineHook, getWikiState, setWikiState, TypeHookStore } from "./hookUtils";

type TypeUseStateResult = [any, (state:any) => void, Function];

export const useState = (stateKey: string, defaultState?: any):TypeUseStateResult => {
    return defineHook("useState", (options):any => {
        if(options.isInit) {
            const initState = typeof defaultState === "function" ? defaultState() : defaultState;
            const updateState = ((opt, attrKey) => {
                return (newState: any):any => {
                    const updateStateData: any = {};
                    updateStateData[attrKey] = newState;
                    opt.store = newState;
                    opt.setState(updateStateData);
                    return newState;
                };
            })(options, stateKey);
            const saveState = {
                ...(options.component.state || {})
            };
            saveState[stateKey] = initState;
            options.store = initState;
            options.component.state = saveState;
            return [initState, updateState];
        } else {
            const hookReturn = options.returnValue || [];
            return [options.store, hookReturn[1]];
        }
    });
};
