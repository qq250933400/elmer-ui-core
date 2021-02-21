import { ARenderMiddleware, TypeRenderMiddlewareEvent } from "./ARenderMiddleware";
// tslint:disable: no-empty
export class RenderMiddlewarePlugin extends ARenderMiddleware {
    beforeInit?(options: TypeRenderMiddlewareEvent): void {}
    init?(options: TypeRenderMiddlewareEvent): void {}
    beforeRender?(options: TypeRenderMiddlewareEvent): void {}
    afterRender?(options: TypeRenderMiddlewareEvent): void {}
    beforeUpdate?(options: TypeRenderMiddlewareEvent): void {}
    destroy?(options: TypeRenderMiddlewareEvent): void {}
    didMount?(options: TypeRenderMiddlewareEvent): void {}
    /**
     * 整个dom树第一次渲染结束事件
     */
    renderDidMount?(): void;
}
// tslint:enable: no-empty
