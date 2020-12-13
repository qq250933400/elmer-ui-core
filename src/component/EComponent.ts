import { Common } from "elmer-common";
import { IVirtualElement } from "elmer-virtual-dom";
import { IElmerEvent } from "../core/IElmerInterface";
import { IDeclareConnect, IDeclareI18n } from "../interface/IDeclareComponentOptions";
import { IPropCheckRule } from "../propsValidation";
import { IComponent } from "./IComponent";

export const CONST_CLASS_COMPONENT_FLAG = "COMPONENT_113df7d2-555c-53a1-30fb-58627fd7";

export abstract class EComponent<P={}, S={}, C={}> extends Common implements IComponent {
    static flag = CONST_CLASS_COMPONENT_FLAG;
    propType?: {[PT in keyof P]?: IPropCheckRule};
    parent?: HTMLElement;
    domList: any;
    dom: any;
    props?: P;
    state?: S;
    context?: C;
    model?: any;
    service?: any;
    constructor(props: P, context?: C) {
        super();
        this.props = props;
        this.context = context;
    }
    vdom: IVirtualElement;
    htmlCode?: string;
    connect?: IDeclareConnect;
    i18nConfig?: IDeclareI18n;
    i18nLocale?: string;
    i18nRegion?: string;
    i18nRootKey?: string;
    i18nData?: any;
    public $render?(): any;
    public $contextData?(context: any): void;
    public $willReceiveProps?(propData: any, oldProps: any): void;
    public $init?(): void;
    public $inject?(): void;
    public $before?(): void;
    public $beforeVirtualRender?(dom?: IVirtualElement): void;
    public $beforeDiff?(dom?: IVirtualElement): void;
    public $beforeRender?(): boolean;
    public $afterVirtualRender?(dom?: IVirtualElement): void;
    public $resize?(event:IElmerEvent): void;
    public $unMount?(): void;
    public $didMount?(): void;
    public $didUpdate?(): void;
    public $willMount?(): void;
    // public addEvent?(handle: any, dom: HTMLElement | Element | Node, eventName: string, callBack: Function, options?: AddEventListenerOptions): void;
    setData<T>(data: {} & T, ...argv:any[]): void {
        throw new Error("Method not implemented.");
    }
    setState<T>(data: T & {[P in keyof S]?:S[P]}, ...argv:any[]): void {
        throw new Error("Method not implemented.");
    }
    redirect?(path: string, params?: any): void {
        throw new Error("Method not implemented.");
    }
}
