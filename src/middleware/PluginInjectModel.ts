import { utils } from "elmer-common";
import { Service } from "../decorators";
import { getServiceObj } from "../decorators/Autowired";
import { TypeRenderMiddlewareEvent } from "./ARenderMiddleware";
import { RenderMiddlewarePlugin } from "./RenderMiddlewarePlugin";

@Service
export class PluginInjectModel extends RenderMiddlewarePlugin {
    init(options:TypeRenderMiddlewareEvent): void {
        const injectModel = options.Component.prototype.injectModel;
        const injectService = options.Component.prototype.injectService;
        this.doInject(options.componentObj, injectModel, "model");
        this.doInject(options.componentObj, injectService, "service", true);
        (injectModel || injectService) && typeof options?.componentObj.$inject === "function" && options.componentObj.$inject();
    }
    /**
     *
     * @param target 将模块注入到指定对象上
     * @param models 注入模块
     * @param propertyKey 绑定的属性名称，不设置使用model中的key
     * @param isAutowired 是否使用全局对象
     */
    private doInject(target: any, models: object, propertyKey?: string, isAutowired?: boolean): void {
        if(typeof propertyKey === "string" && propertyKey.length>0) {
            if(!target[propertyKey]) {
                target[propertyKey] = {};
            }
        }
        if(target && models && Object.keys(models).length>0) {
            Object.keys(models).map((tmpKey) => {
                if(!utils.isEmpty(tmpKey)) {
                    const tmpFactory: Function = <Function>models[tmpKey];
                    if(typeof tmpFactory === "function") {
                        const tmpObj = !isAutowired ? (new (<any>tmpFactory)(target)) : getServiceObj(<any>tmpFactory);
                        if(!utils.isEmpty(propertyKey)) {
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
