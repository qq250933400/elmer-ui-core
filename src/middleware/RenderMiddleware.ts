import { autoInit, injectable  } from "../inject";
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
    destroy(options: TypeRenderMiddlewareEvent): void {
        this.callPluginMethod("destroy", options);
    }
    renderDidMount(): void {
        this.callPluginMethod("renderDidMount", null);
    }
    private initPlugins(): void {
        this.PluginFactorys.map((Plugin) => {
            this.plugins.push(autoInit(Plugin as any));
        });
    }
    private callPluginMethod(methodName: keyof ARenderMiddleware, options: TypeRenderMiddlewareEvent): void {
        this.plugins.map((plugin) => {
            try {
                typeof plugin[methodName] === "function" && plugin[methodName](options);
            } catch(err) {
                // tslint:disable-next-line: no-console
                console.error(err);
            }
        });
    }
}
