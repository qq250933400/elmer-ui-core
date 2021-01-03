import { IVirtualElement } from "elmer-virtual-dom";
import { IElmerEvent } from "../events/IElmerEvent";

export const HOOKS_USE_EFFECT_SSID = "USE-EFFECT-d5603e60-632c-a1ac-06c1-dc45569d";

type TypeUseEffectLifyCycle = {
    events?: any;
    $init?(): void;
    $inject?(): void;
    $resize?(event:IElmerEvent): void;
    $didMount?():void;
    $didUpdate?():void;
    $willMount?(): void;
    $willReceiveProps?(propData: any,oldProps: any): void;
};

/**
 * 生命周期钩子函数,针对函数组件使用
 * @param StaticComponentOptions
 */
export const useEffect = (StaticComponentOptions:any, lifeCycleOptions: TypeUseEffectLifyCycle) => {
    if(!StaticComponentOptions || StaticComponentOptions.useEffectSSID !== HOOKS_USE_EFFECT_SSID) {
        throw new Error("useEffect只能在函数组件使用并且需要传递函数组件第二个参数");
    }
    const lifeCycleMethodNames = ["$willReceiveProps", "$init", "$inject", "$resize", "$didMount", "$didUpdate", "$willMount"];
    const instance = StaticComponentOptions.instance;
    if(lifeCycleOptions) {
        if(!instance.useEffect) {
            Object.defineProperty(instance, "useEffect", {
                configurable: false,
                enumerable: false,
                value: true,
                writable: false
            });
            Object.keys(lifeCycleOptions).map((name:string) => {
                if(lifeCycleMethodNames.indexOf(name)>=0) {
                    Object.defineProperty(instance, name, {
                        configurable: false,
                        enumerable: false,
                        get: lifeCycleOptions[name],
                        set: () => {
                            throw new Error("useEffect不允许直接需改方法");
                        }
                    });
                } else {
                    if(name === "events") {
                        if(lifeCycleOptions.events) {
                            Object.keys(lifeCycleOptions.events).map((evtName) => {
                                if(typeof lifeCycleOptions.events[evtName] !== "function") {
                                    throw new Error(`静态组件定义事件错误，${evtName}不是一个Function`);
                                }
                            });
                        }
                        Object.defineProperty(instance, "events", {
                            configurable: false,
                            enumerable: false,
                            get: () => lifeCycleOptions.events,
                            set: () => {
                                throw new Error("useEffect不允许直接需改方法");
                            }
                        });
                    }
                }
            });
        }
    }
};
