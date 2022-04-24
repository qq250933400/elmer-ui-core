import { defineHook } from "./hookUtils";
import { utils } from "elmer-common";

type TypeUseStateResult<T={}> = [(state:any, update?: boolean) => Promise<T>, () => T, T];

export const useState = <T extends {}>(stateKey: string, defaultState?: T | Function):TypeUseStateResult<T> => {
    return defineHook("useState", (options):any => {
        if(options.isInit) {
            const initState = typeof defaultState === "function" && utils.isFunction(defaultState) ? (defaultState as Function)() : defaultState;
            const setState = ((opt, component: any) => {
                return (newState: any, isUpdate?: boolean): Promise<any> => {
                    opt.store.stateValue = newState; // save the state to hookStore
                    if(isUpdate === undefined) {
                        const updateState = {};
                        updateState[opt.store.stateKey] = newState;
                        return (component as any).setState(updateState);
                    } else if(isUpdate) {
                        const allStateStore = opt.getHookStore("useState");
                        const allState = {};
                        allStateStore.map((stateStore) => {
                            allState[stateStore.store.stateKey] = stateStore.store.stateValue;
                        });
                        return (component as any).setState(allState);
                    } else {
                        return Promise.resolve({});
                    }
                };
            })(options, options.component);
            const saveState = {
                ...(options.component.state || {})
            };
            const getStatus = ((opt)=>()=>opt.store.stateValue)(options);
            saveState[stateKey] = initState;
            options.store = {
                stateKey,
                stateValue: initState
            };
            options.component.state = saveState; // set init state
            return [setState, getStatus, initState];
        } else {
            const hookReturn = options.returnValue || [];
            return [hookReturn[0], hookReturn[1], options.store.stateValue];
        }
    });
};
