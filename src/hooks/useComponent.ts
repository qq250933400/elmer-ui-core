import { utils } from "elmer-common";
import { getComponents, loadComponents } from "../decorators/loadComponents";
import { defineHook } from "./hookUtils";

export const useComponent = (selector: string, Component: Function): any => {
    return defineHook("useComponent", (opt) => {
        if(opt.isInit) {
            const newComponents = {};
            newComponents[selector] = Component;
            opt.component.registeComponents(newComponents);
        }
    });
};
