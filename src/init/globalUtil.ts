// import { global } from "../global";

export default class GlobalUtils {
    isDev():boolean {
        return true;
    }
}

/**
 * 定义全局状态，通过此方法定义，防止被其他模块定义混乱而被覆盖掉
 * @param stateKey  stateKey
 * @param stateValue stateValue
 * @param ignoreError [boolean] if ignoreError === false then throw error
 */
export const defineGlobalState = (stateKey: string, stateValue: any, ignoreError?: boolean) => {
    if(stateKey !== undefined && stateKey !== null && stateKey.length>0) {
        Object.defineProperty(elmerData.elmerState, stateKey, {
            configurable: false,
            enumerable: true,
            value: stateValue,
            writable: false
        });
    } else {
        if(!ignoreError) {
            throw new Error("定义全局状态失败，stateKey不能为空！");
        }
    }
};

export const getGlobalState = (stateKey: string): any => {
    return elmerData.elmerState[stateKey];
};
/**
 * 定义全局变量，保存到window对象
 * @param varKey 变量名称
 * @param varValue 变量值
 */
export const defineGlobalVar = (varKey:string, varValue: any) => {
    if(varKey !== undefined && varKey !== null && varKey.length>0) {
        Object.defineProperty(window, varKey, {
            configurable: false,
            enumerable: true,
            value: varValue,
            writable: false
        });
    } else {
        throw new Error("定义全局状态失败，stateKey不能为空！");
    }
};

export const getGlobalVar = (varkey:string): any => {
    return window[varkey];
};

export const addToClassPool = (className: string, factory: Function, fn?:Function): void => {
    if(factory) {
        let hasExists = false;
        factory.prototype.className = className;
        if(typeof window !== "undefined" && window["elmerData"]) {
            for(const tmpClass of elmerData.classPool) {
                if(tmpClass.prototype.className === className) {
                    hasExists = true;
                    break;
                }
            }
            if(!hasExists) {
                typeof fn === "function" && fn();
                elmerData.classPool.push(factory);
            }
        }
    }
};
// tslint:disable 
export const __extends = (this && this.__extends) || (function () {
    const ignorePropKeys = ["selector", "template", "model","service","i18n", "connect","setData","setState", "render"]; // 忽略属性是不需要继承的组件特殊属性
    const extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) {
            for (var p in b) {
                if (b.hasOwnProperty(p) && ignorePropKeys.indexOf(p)<0){
                    d[p] = b[p];
                }
            }
        };
    return function (d: any, b: any) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
// tslint:enable
