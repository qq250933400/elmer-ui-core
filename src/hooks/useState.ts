import { defineHook } from "./hookUtils";

type TypeUseStateResult = [(state:any, update?: boolean) => Promise<any>, () => any, any];

export const useState = (stateKey: string, defaultState?: any):TypeUseStateResult => {
    return defineHook("useState", (options):any => {
        if(options.isInit) {
            const initState = typeof defaultState === "function" ? defaultState() : defaultState;
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
