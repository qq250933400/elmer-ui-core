import { utils } from "elmer-common";
import { getComponents, loadComponents } from "../decorators/loadComponents";
import { defineHook } from "./hookUtils";

type TypeUserComponentOption = {
    replace?: boolean;
};

export const useComponent = (selector: string, Component: Function, option?: TypeUserComponentOption): any => {
    return defineHook("useComponent", (opt) => {
        if(opt.isInit || option?.replace) {
            const oldComponents = getComponents(opt.component);
            const newComponents = {...(oldComponents || {})};
            newComponents[selector] = Component;
            loadComponents(newComponents)(opt.Factory as any);
        }
    });
};
