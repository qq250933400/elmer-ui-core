import { getWikiState, setWikiState, TypeHookStore } from "./hookUtils";

type TypeUseStateResult = [any, (state:any) => void, Function];

export const useState = (stateKey: string, initState?: any):TypeUseStateResult => {
    const componentObj = <any>getWikiState("_this");
    const hookStore = <TypeHookStore>getWikiState("hookStore");
    const useStateIndex = <any>getWikiState("useStateIndex");
    if(!hookStore) {
        throw new Error("[useState] Something went wrong!!!");
    }
    if(!hookStore.useState[useStateIndex]) {
        const updateStateHook:any = ((obj:any, store: TypeHookStore, stateIndex: any, stateName: string): Function => {
            return (newState:any) => {
                const useStateObj = store.useState[stateIndex];
                if(JSON.stringify(useStateObj.state) !== JSON.stringify(newState)) {
                    const updateState = {};
                    updateState[stateName] = newState;
                    store.useState[stateIndex].state = newState;
                    obj.setState(updateState);
                }
            };
        })(componentObj, hookStore, useStateIndex, stateKey);
        const getState = ((store, index) => {
            return () => {
                const useStateObj = store.useState[index];
                return useStateObj.state;
            };
        })(hookStore, useStateIndex);
        hookStore.useState[useStateIndex] = {
            state: initState,
            stateKey,
            // tslint:disable-next-line: object-literal-sort-keys
            callback: updateStateHook,
            getState
        };
        if(!componentObj.state) {
            componentObj.state = {};
        }
        componentObj.state[stateKey] = initState;
        setWikiState("useStateIndex", useStateIndex + 1);
        return [initState, updateStateHook, getState];
    } else {
        setWikiState("useStateIndex", useStateIndex + 1);
        return [
            hookStore.useState[useStateIndex].state,
            hookStore.useState[useStateIndex].callback,
            hookStore.useState[useStateIndex].getState
        ];
    }
};
