import { defineHook } from "./hookUtils";

type TypeUseStateResult = [any, (state:any) => Promise<any>, Function];

export const useState = (stateKey: string, defaultState?: any):TypeUseStateResult => {
    return defineHook("useState", (options):any => {
        if(options.isInit) {
            const initState = typeof defaultState === "function" ? defaultState() : defaultState;
            const updateState = ((opt, attrKey) => {
                return (newState: any):any => {
                    const updateStateData: any = {};
                    updateStateData[attrKey] = newState;
                    opt.store = newState;
                    return opt.setState(updateStateData);
                };
            })(options, stateKey);
            const saveState = {
                ...(options.component.state || {})
            };
            const getStatus = ((opt)=>()=>opt.store)(options);
            saveState[stateKey] = initState;
            options.store = initState;
            options.component.state = saveState;
            return [initState, updateState, getStatus];
        } else {
            const hookReturn = options.returnValue || [];
            const hookState = options.component?.state[stateKey];
            return [hookState, hookReturn[1], hookReturn[2]];
        }
    });
};
