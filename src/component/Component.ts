import { Common } from "elmer-common";
import { IVirtualElement } from "elmer-virtual-dom";
import { IElmerEvent } from "../events/IElmerEvent";
import { IDeclareI18n, IReduxConnect } from "./IDeclareComponent";
import { IPropCheckRule } from "../propsValidation";
import { IComponent } from "./IComponent";

export const CONST_CLASS_COMPONENT_FLAG = "COMPONENT_113df7d2-555c-53a1-30fb-58627fd7";

export abstract class Component<P={}, S={}, C={}> extends Common implements IComponent {
    static flag:string = CONST_CLASS_COMPONENT_FLAG;
    propType?: {[PT in keyof P]?: IPropCheckRule};
    parent?: HTMLElement;
    dom: any;
    props?: P;
    state?: S;
    context?: C;
    model?: any;
    service?: any;
    vdom: IVirtualElement;
    htmlCode?: string;
    connect?: IReduxConnect;
    i18nConfig?: IDeclareI18n;
    i18nLocale?: string;
    i18nRegion?: string;
    i18nRootKey?: string;
    i18nData?: any;
    constructor(props: P, context?: C) {
        super();
        this.props = props;
        this.context = context;
    }
    public $render?(): any;
    public $contextData?(context: any): void;
    public $willReceiveProps?(propData: P, oldProps: P): void;
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
    /**
     * 更新数据，触发组件重新渲染(已废弃)
     * @deprecated
     * @param data 更新数据
     * @param argv 其他参数
     */
    setData<T>(data: {} & T, ...argv:any[]): Promise<any> {
        throw new Error("Method not implemented.");
    }
    /**
     * 更新数据，触发组件重新渲染，数据只更新到state属性
     * @param data 更新数据
     * @param argv 其他参数
     * @returns {Promise<any>}
     */
    setState<T>(data: T & {[SP in keyof S]?:S[SP]}, ...argv:any[]): Promise<any> {
        throw new Error("Method not implemented.");
    }
}
