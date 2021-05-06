
import "@babel/polyfill";
import "core-js/es5";
import utilsModule from "./core/utils";

export const utils = utilsModule;

export * from "./core/ElmerService";
export * from "./core/globalState";
export * from "./core/ElmerDom";
export * from "./injectable";
export * from "./animation/ElmerAnimation";
export * from "./component";
export * from "./context";
export * from "./hooks";
export * from "./render";
export * from "./widget";
export * from "./events/IElmerEvent";
export * from "./propsValidation";
export * from "./core/Observer";
// todo: refractor entry code
