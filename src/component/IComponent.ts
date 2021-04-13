import { IVirtualElement } from "elmer-virtual-dom";
import { IElmerEvent } from "../events/IElmerEvent";
import { IDeclareI18n, IReduxConnect } from "./IDeclareComponent";

export type TypeGetContextResult = {
    name: string;
    data?: any;
};
export type TypeGetContextOption = {
    path: number[];
    props: any;
};

export interface IComponent<P=Object, S=Object, C=Object> {
    vdom: IVirtualElement;
    dom: any;
    i18n?: any;
    props?: P;
    state?: S;
    context?: C;
    /**
     * 注入model对象，每个组件都会初始化一个新对象
     */
    model?: any;
    /**
     * 注入service对象，注入的service对象在整个app只保存一个变量
     */
    service?: any;
    $getContext?(option: TypeGetContextOption): TypeGetContextResult;
    render?():any;
    $init?(): void;
    $inject?(): void;
    $before?(): void;
    $beforeVirtualRender?(dom?:IVirtualElement): boolean|undefined;
    $beforeRender?(dom: IVirtualElement): boolean;
    $after?(): void;
    $afterVirtualRender?(dom?:IVirtualElement): void;
    $resize?(event:IElmerEvent): void;
    $dispose?(): void;
    $didMount?():void;
    $didUpdate?():void;
    $willMount?(): void;
    /**
     * 修改数据,已经改为使用setState方法
     * @deprecated
     * @param data - 修改数据
     * @param refresh - 是否强制刷新
     */
    setData(data: object, refresh?: boolean): Promise<any>;
    /**
     * 修改组件state触发组件重绘
     * @param data any 修改state
     * @param refresh boolean 强制重绘，用于解决修改地址引用变量导致无法检查出state有没有更新
     */
    setState<T>(data: T & P, refresh?: boolean): Promise<any>;
}

