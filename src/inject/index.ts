import { autoInit as autoInitFn,globalClassFactory as GlobalClassFactory } from "./globalClassFactory";
import { autowired as Autowired, declareComponent as DeclareComponent, Injectable as injectableFn } from "./injectable";

export const autowired = Autowired;
export const declareComponent = DeclareComponent;
/**
 * Injectable 命名不规范，将要弃用
 * Duplicate todo
 */
export const Injectable = injectableFn;
export const globalClassFactory = GlobalClassFactory;
export const autoInit = autoInitFn;

export default {
    title: "Injectable",
    version: "1.0.1"
};
