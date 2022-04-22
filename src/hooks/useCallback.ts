import { utils } from "elmer-common";
import { defineHook } from "./hookUtils";

type TypeUseCallbackHookOptions = {
    args?: any[]; // protect arguments, 设置以后只有当参数有变化时才会执行
    value?: any;
    name?: string; // 不为空时将callback绑定到Component对象上
    event?: boolean;
    useArgsOnly?: boolean; // 只接收options.args參數
};

type TypeUseCallback = <T>() => T;

/**
 * 自定义callback hook函数
 * options.event === true时，在函数组件被调用的时候callback不会被调用
 * options.event === false时，在函数组件方法被调用时候，当options.args设置有内容时只有参数变化callback才会被调用
 * @param callback 回调函数
 * @param options - 参数
 * @returns 返回结果
 */
export const useCallback = (callback: Function, options?: TypeUseCallbackHookOptions):[any, TypeUseCallback] => {
    return defineHook("useCallback", (opt):any => {
        if(opt.isInit) {
            const storeData = {
                args: options?.args ? JSON.parse(JSON.stringify(options?.args)) : [],
                name: options?.name,
                useArgsOnly: options?.useArgsOnly,
                value: options?.value
            };
            const newCallback = ((hookStore: any, fn: Function) => {
                // tslint:disable-next-line: only-arrow-functions
                return function():any {
                    const newArgs = arguments;
                    const optArgs = hookStore?.args || [];
                    const applyNewArgs = [];
                    if(!hookStore?.useArgsOnly && newArgs.length > 0) {
                        for(let i=0;i<newArgs.length;i++) {
                            applyNewArgs.push(newArgs[i]);
                        }
                    }
                    applyNewArgs.push(...optArgs);
                    return fn.apply(null, applyNewArgs);
                };
            })(storeData, callback);
            opt.store = storeData;
            if(!utils.isEmpty(options.name)) {
                opt.component[options.name] = newCallback;
            }
            if(options?.args?.length > 0 && !options?.event) {
                storeData.value = newCallback.apply(null, options?.args || []);
            }
            return [storeData.value, newCallback];
        } else {
            const newCallbackFn = opt.returnValue[1];
            let newValue = opt.returnValue[0];
            if(options?.args?.length > 0 && !options?.event) {
                if(!utils.isEqual(options.args, opt.store.args)) {
                    // 更新最新参数
                    // 当在store设置args时，callback传递参数为opt.store.args
                    opt.store.args = options?.args ? JSON.parse(JSON.stringify(options?.args)) : [];
                    newValue = newCallbackFn.apply(null, options.args || []);
                }
            } else {
                opt.store.args = options?.args ? JSON.parse(JSON.stringify(options?.args)) : []; // 更新最新参数
            }
            return [newValue, newCallbackFn];
        }
    });
};
