import { StaticCommon as utils } from "elmer-common";
import { getWikiState, setWikiState, TypeHookStore } from "./hookUtils";

export const useComponent = (selector: string, Component: Function): Function => {
    const renderObj = <any>getWikiState("_renderObj");
    const hookStore = <TypeHookStore>getWikiState("hookStore");
    const hookIndex = <any>getWikiState("useComponentIndex");
    const componentObj = <any>getWikiState("_this");
    if(!hookStore) {
        throw new Error("[useComponent] Something went wrong!!!");
    }
    if(utils.isEmpty(selector)) {
        throw new Error("[useComponent] selector can not be an empty string");
    }
    if(!hookStore.useComponent[hookIndex]) {
        const useComponentCallback = ((vRenderObj: any, obj:any) => {
            return (NewComponent: Function) => {
                console.log(vRenderObj);
                vRenderObj.userComponents[selector] = NewComponent;
            };
        })(renderObj, componentObj);
        if(!renderObj.userComponents[selector]) {
            renderObj.userComponents[selector] = Component;
        }
        hookStore.useComponent[hookIndex] = useComponentCallback;
        setWikiState("useComponentIndex", hookIndex + 1);
        return useComponentCallback;
    } else {
        setWikiState("useComponentIndex", hookIndex + 1);
        return hookStore.useComponent[hookIndex];
    }
};
