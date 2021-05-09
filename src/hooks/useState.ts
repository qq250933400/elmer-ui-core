import { defineHook } from "./hookUtils";

type TypeUseStateResult = [(state:any) => Promise<any>, () => any, any];

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
            return [updateState, getStatus, initState];
        } else {
            const hookReturn = options.returnValue || [];
            return [hookReturn[0], hookReturn[1], options.store];
        }
    });
};
