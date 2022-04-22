import { Common } from "elmer-common";
import { IVirtualElement } from "elmer-virtual-dom";
import { IElmerEvent } from "../events/IElmerEvent";
import { IPropValidator } from "../propsValidation";
import { IComponent, TypeGetContextOption, TypeGetContextResult } from "./IComponent";

type TypeDefinePropTypes<T={}> = {[P in keyof T]?: IPropValidator};

export const CONST_CLASS_COMPONENT_FLAG = "COMPONENT_113df7d2-555c-53a1-30fb-58627fd7";

export abstract class Component<P={children?: IVirtualElement[]}, S={}, C={}> extends Common implements IComponent {
    static flag:string = CONST_CLASS_COMPONENT_FLAG;
    static propTypes?: TypeDefinePropTypes;
    static $willReceiveProps?(newProps: any,oldProps: any): any;
    parent?: HTMLElement;
    dom: any;
    props?: P & {children?: IVirtualElement[]};
    state?: S;
    context?: C;
    model?: any;
    service?: any;
    vdom: IVirtualElement;
    i18n?: any;
    constructor(props: P & {children?: IVirtualElement[]}, context?: C) {
        super();
        this.props = props;
        this.context = context;
    }
    public $render?(): any;
    public $init?(): void;
    public $inject?(): void;
    public $before?(): void;
    public $beforeVirtualRender?(dom?: IVirtualElement): boolean|undefined;
    public $beforeDiff?(dom?: IVirtualElement): void;
    public $beforeRender?(dom: IVirtualElement): boolean;
    public $afterVirtualRender?(dom?: IVirtualElement): void;
    public $resize?(event:IElmerEvent): void;
    public $unMount?(): void;
    public $didMount?(): void;
    public $didUpdate?(): void;
    public $willMount?(): void;
    public $getComponents?(): any;
    public $getContext?(option: TypeGetContextOption): TypeGetContextResult;
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