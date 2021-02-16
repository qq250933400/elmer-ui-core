import { Common } from "elmer-common";
import { createClassFactory } from "../inject/createClassFactory";
import { injectable } from "../inject/injectable";
import { TypeRenderMiddlewareEvent } from "./ARenderMiddleware";

@injectable("PluginInjectModel")
export class PluginInjectModel extends Common {
    init(options:TypeRenderMiddlewareEvent): void {
        const injectModel = options.Component.prototype.injectModel;
        const injectService = options.Component.prototype.injectService;
        this.inject(options.componentObj, injectModel, "model");
        this.inject(options.componentObj, injectService, "service", true);
    }
    /**
     *
     * @param target 将模块注入到指定对象上
     * @param models 注入模块
     * @param propertyKey 绑定的属性名称，不设置使用model中的key
     * @param isAutowired 是否使用全局对象
     */
    private inject(target: any, models: object, propertyKey?: string, isAutowired?: boolean): void {
        if(typeof propertyKey === "string" && propertyKey.length>0) {
            if(!target[propertyKey]) {
                target[propertyKey] = {};
            }
        }
        if(target && models && Object.keys(models).length>0) {
            Object.keys(models).map((tmpKey) => {
                if(!this.isEmpty(tmpKey)) {
                    const tmpFactory: Function = <Function>models[tmpKey];
                    if(typeof tmpFactory === "function") {
                        const tmpObj = !isAutowired ? (new (<any>tmpFactory)(target)) : createClassFactory(<any>tmpFactory);
                        if(!this.isEmpty(propertyKey)) {
                            target[propertyKey][tmpKey] = tmpObj;
                        } else {
                            target[tmpKey] = tmpObj;
                        }
                    } else {
                        // tslint:disable-next-line:no-console
                        console.log(target.className,models);
                        throw new Error(tmpKey + "注入对象不是function");
                    }
                } else {
                    throw new Error("注入模块必须设置propertyKey");
                }
            });
        }
    }
}
