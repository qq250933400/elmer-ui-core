import { Common } from "elmer-common";
import { IVirtualElement } from "elmer-virtual-dom";
import { IPropCheckRule } from "../propsValidation";
import { IComponent } from "./IComponent";

export abstract class EComponent<P={}, S={}, C={}> extends Common implements IComponent {
    parent?: HTMLElement;
    domList: any;
    dom: any;
    propType?: {[PT in keyof P]?: IPropCheckRule​​};
    props?: P;
    state?: S;
    context?: C;
    model?: any;
    service?: any;
    constructor(props: P, context: C) {
        super();
        this.props = props;
        this.context = context;
    }
    abstract $render?(): any;
    abstract $contextData?(context: any): void;
    abstract $willReceiveProps?(propData: any, oldProps: any): void;
    abstract $init?(): void;
    abstract $inject?(): void;
    abstract $before?(): void;
    abstract $beforeVirtualRender?(dom?: IVirtualElement): void;
    abstract $beforeDiff?(dom?: IVirtualElement): void;
    abstract $beforeRender?(): boolean;
    abstract $afterVirtualRender?(dom?: IVirtualElement): void;
    abstract $resize?(): void;
    abstract $unMount?(): void;
    abstract $didMount?(): void;
    abstract $didUpdate?(): void;
    abstract $willMount?(): void;
    abstract addEvent?(handle: any, dom: HTMLElement | Element | Node, eventName: string, callBack: Function, options?: AddEventListenerOptions): void;
    setData(data: object, refresh?: boolean): void {
        throw new Error("Method not implemented.");
    }
    setState<T>(data: T & S, refresh?: boolean): void {
        throw new Error("Method not implemented.");
    }
    redirect?(path: string, params?: any): void {
        throw new Error("Method not implemented.");
    }
}
