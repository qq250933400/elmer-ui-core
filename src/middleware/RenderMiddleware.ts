import { CONST_CLASS_COMPONENT_FLAG } from "../component";
import { autoInit, injectable  } from "../injectable";
import { ARenderMiddleware, TypeRenderMiddlewareEvent } from "./ARenderMiddleware";
import { PluginInjectModel } from "./PluginInjectModel";
import { PluginPropsChecking } from "./PluginPropsChecking";
import { PluginRedux } from "./PluginRedux";

@injectable("RenderMiddleware")
export class RenderMiddleware extends ARenderMiddleware {
    plugins: ARenderMiddleware[] = [];
    private PluginFactorys:Function[] = [];
    constructor() {
        super();
        this.PluginFactorys = [
            PluginPropsChecking,
            PluginRedux,
            PluginInjectModel
        ];
        this.initPlugins();
    }
    beforeInit(options: TypeRenderMiddlewareEvent): void {
        this.callPluginMethod("beforeInit", options);
    }
    init(options: TypeRenderMiddlewareEvent): void {
        this.mergeFunctionComponentProperty(options);
        this.callPluginMethod("init", options);
    }
    didMount(options: TypeRenderMiddlewareEvent): void {
        this.callPluginMethod("didMount", options);
    }
    beforeRender(options: TypeRenderMiddlewareEvent): void {
        this.callPluginMethod("beforeRender", options);
    }
    afterRender(options: TypeRenderMiddlewareEvent): void {
        this.callPluginMethod("afterRender", options);
    }
    beforeUpdate(options: TypeRenderMiddlewareEvent): void {
        this.callPluginMethod("beforeUpdate", options);
    }
    afterUpdate(options: TypeRenderMiddlewareEvent): void {
        this.callPluginMethod("afterUpdate", options);
    }
    destroy(options: TypeRenderMiddlewareEvent): void {
        this.callPluginMethod("destroy", options);
    }
    renderDidMount(): void {
        this.callPluginMethod("renderDidMount", null);
    }
    willReceiveProps?(options: TypeRenderMiddlewareEvent): void {
        this.callPluginMethod("willReceiveProps", options);
    }
    private initPlugins(): void {
        this.PluginFactorys.map((Plugin, index) => {
            this.plugins.push(autoInit(Plugin as any, {
                argv: [
                    {
                        raiseEvent: ((key: any) => {
                            return (name: keyof ARenderMiddleware, options: TypeRenderMiddlewareEvent) => {
                                this.callPluginMethod(name, options, [key]);
                            };
                        })(index)
                    }
                ],
                mode: "None"
            }));
        });
    }
    private callPluginMethod(methodName: keyof ARenderMiddleware, options: TypeRenderMiddlewareEvent, ignorePlugin?: any[]): void {
        this.plugins.map((plugin, index) => {
            try {
                if(!ignorePlugin || (ignorePlugin.indexOf(index)<0)) {
                    typeof plugin[methodName] === "function" && plugin[methodName](options);
                }
            } catch(err) {
                // tslint:disable-next-line: no-console
                console.error(err);
            }
        });
        const allowMethods = ["init", "inject", "didMount", "didUpdate", "willReceiveProps", "destroy"];
        if(allowMethods.indexOf(methodName) >= 0) {
            if(methodName !== "destroy" && options?.componentObj["$hookEffects"]) {
                const hookEffects = options?.componentObj["$hookEffects"];
                Object.keys(hookEffects).map((hookIndex) => {
                    hookEffects[hookIndex](methodName, {
                        props: options?.props,
                        state: options?.componentObj?.state
                    });
                });
            }
            if(methodName === "destroy" && options?.componentObj["$hookDestory"]) {
                const hookDestory = options?.componentObj["$hookDestory"];
                Object.keys(hookDestory).map((hookIndex) => {
                    typeof hookDestory[hookIndex] === "function" && hookDestory[hookIndex](methodName);
                });
            }
        }
    }
    private mergeFunctionComponentProperty(options: TypeRenderMiddlewareEvent): void {
        const flag = (<any>options.Component).flag;
        if(flag !== CONST_CLASS_COMPONENT_FLAG) {
            Object.keys(options.Component).map((attrKey) => {
                (options.componentObj as any)[attrKey] = (options.Component as any)[attrKey];
            });
        }
    }
}
