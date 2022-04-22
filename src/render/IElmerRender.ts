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
    depth: number;
};

export type TypeVirtualRenders<T={}> = {[P in keyof T]: IElmerRender};

export type TypeCurrentRenderDispatch = {
    component: any;
    hookState: {
        hookIndex: number;
        state: any;
    },
    isFunc: Boolean;
    Factory: Function|Component;
};

export type TypeRenderGetNodeResult = {
    isDidMount: boolean;
    dom?: HTMLElement
};

export type TypeElmerRenderDispatchNodes = {
    vParent: IVirtualElement;
    vdom: IVirtualElement;
};

export type TypeGetNodeOptions = {
    hasDomNode?: boolean;
    getFirstNode(virtualId: string): TypeRenderGetNodeResult;
    getLastNode(virtualId: string): TypeRenderGetNodeResult;
};

export type TypeRenderSession = {
    component: any;
    useComponents: any;
    token?: string;
    depth: number;
    nodePath: number[];
    nodeId: string;
    eventListeners: any[];
    ComponentFactory: Function|Component;
    registeComponents(components: any): void;
    removeRender(virtualId: string): void,
    saveRender(virtualId: string, renderObj: any): void;
    getRender(virtualId: string): IElmerRender;
    getComponentLastElement(virtualId: string): TypeRenderGetNodeResult;
    getComponentFirstElement(virtualId: string): TypeRenderGetNodeResult;
};

export type TypeVirtualRenderSession<T={}> = {[P in keyof T]: TypeRenderSession};

export type TypeRenderActionConnectOptions = {
    sessionId: string;
    container: HTMLElement;
    vRender: any;
    vdom: IVirtualElement;
    vdomParent?: IVirtualElement;
    getRenderSession(sessionId: string):TypeRenderSession;
};

export interface IElmerRender {
    render(options: TypeRenderQueueOptions): Promise<any>;
    destory(): void;
    getFirstDom():HTMLElement | null | undefined;
    getLastDom(): HTMLElement | null | undefined;
}
