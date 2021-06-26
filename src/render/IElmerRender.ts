import { IVirtualElement } from "elmer-virtual-dom";
import { Component } from "../component/Component";
import { TypeRenderQueueOptions } from "./RenderQueue";

export type TypeElmerRenderOptions = {
    vdom: IVirtualElement;
    container: HTMLElement;
    component: Object;
    ComponentFactory: Component;
    children: IVirtualElement[];
    path: number[];
    previousSibling: HTMLElement;
    nextSibling: HTMLElement;
    useComponents: any;
};

export interface IElmerRender {
    render(options: TypeRenderQueueOptions): Promise<any>;
    destory(): void;
    getFirstDom():HTMLElement | null | undefined;
    getLastDom(): HTMLElement | null | undefined;
}

export type TypeVirtualRenders<T={}> = {[P in keyof T]: IElmerRender};
