import { IVirtualElement } from "elmer-virtual-dom";
import { Component } from "../component/Component";

type TypeRenderMiddlewareEvent = {
    componentObj?: Component;
    Component: Function;
    nodeData: IVirtualElement
};

export abstract class RenderMiddleware {
    /**
     * 初始化组件前回调
     * @param options - 参数
     */
    abstract beforeInit?(options: TypeRenderMiddlewareEvent): void;
    /**
     * 组件初始化后执行的方法
     */
    abstract init?(options: TypeRenderMiddlewareEvent):void;
    /**
     * 渲染前回调，所有渲染都调用此方法
     * @param options 
     */
    abstract beforeRender?(options: TypeRenderMiddlewareEvent): void;
    /**
     * 渲染后回调
     * @param options 
     */
    abstract afterRender?(options: TypeRenderMiddlewareEvent): void;
    /**
     * 更新前执行方法，可以在此方法zeng'jia
     * @param options - 更新参数
     */
    abstract beforeUpdate?(options: TypeRenderMiddlewareEvent): void;
}
