import { autoInit as autoInitFn  } from "./createClassFactory";
import { autowired as Autowired, injectable as injectableFn } from "./injectable";

export const autowired = Autowired;
/**
 * Injectable 命名不规范，将要弃用
 * Duplicate todo
 */
export const injectable = injectableFn;
// export const globalClassFactory = GlobalClassFactory;
export const autoInit = autoInitFn;

export default {
    title: "Injectable",
    version: "1.0.1"
};
