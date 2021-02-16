import { IVirtualElement } from "elmer-virtual-dom";
import { Component } from "../component/Component";

export type TypeRenderMiddlewareEvent = {
    componentObj?: Component;
    Component: Function;
    nodeData: IVirtualElement;
    props: any;
};

export abstract class ARenderMiddleware {
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
     * 第一次渲染结束
     * @param options - 更新参数
     */
    abstract didMount?(options: TypeRenderMiddlewareEvent): void;
    /**
     * 渲染前回调，所有渲染都调用此方法
     * @param options 
     */
    abstract beforeRender?(options: TypeRenderMiddlewareEvent): void;
    /**
     * 渲染后回调
     * @param options - 更新参数
     */
    abstract afterRender?(options: TypeRenderMiddlewareEvent): void;
    /**
     * 更新前执行方法，可以在此方法zeng'jia
     * @param options - 更新参数
     */
    abstract beforeUpdate?(options: TypeRenderMiddlewareEvent): void;
    /**
     * 销毁组件
     * @param options - 更新参数
     */
    abstract destroy?(options: TypeRenderMiddlewareEvent): void;
}
