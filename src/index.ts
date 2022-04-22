
import "@babel/polyfill";
import "core-js/es5";
import "./polyfill";
// tslint:disable-next-line: ordered-imports
import utilsModule from "./lib/utils";

export const utils = utilsModule;

export * from "./lib/ElmerService";
export * from "./lib/globalState";
export * from "./lib/ElmerDom";
export * from "./animation/ElmerAnimation";
export * from "./component";
export * from "./context";
export * from "./hooks";
export * from "./render";
// export * from "./widget";
export * from "./events/IElmerEvent";
export * from "./propsValidation";
export * from "./lib/Observer";
export {
    Autowired,
    Model,
    Plugin,
    Service,
    loadComponents
} from "./decorators";
// todo: refractor entry code
