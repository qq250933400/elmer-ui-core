import { ARenderMiddleware, TypeRenderMiddlewareEvent } from "./ARenderMiddleware";

export type TypeMiddlewarePluginOptions = {
    raiseEvent(name: keyof ARenderMiddleware, options: TypeRenderMiddlewareEvent): void;
};
// tslint:disable: no-empty
export class RenderMiddlewarePlugin extends ARenderMiddleware {
    options: TypeMiddlewarePluginOptions;
    constructor(opt?: TypeMiddlewarePluginOptions) {
        super();
        this.options = opt;
    }
    beforeInit?(options: TypeRenderMiddlewareEvent): void {}
    beforeRender?(options: TypeRenderMiddlewareEvent): void {}
    beforeUpdate?(options: TypeRenderMiddlewareEvent): void {}
    afterRender?(options: TypeRenderMiddlewareEvent): void {}
    afterUpdate?(options: TypeRenderMiddlewareEvent): void {}
    destroy?(options: TypeRenderMiddlewareEvent): void {}
    didMount?(options: TypeRenderMiddlewareEvent): void {}
    init?(options: TypeRenderMiddlewareEvent): void {}
    inject?(options: TypeRenderMiddlewareEvent): void {}
    willReceiveProps?(options: TypeRenderMiddlewareEvent): void {}
    /**
     * 整个dom树第一次渲染结束事件
     */
    renderDidMount?(): void;
}
// tslint:enable: no-empty
