import { IVirtualElement } from "elmer-virtual-dom";
import { IElmerEvent } from "../events/IElmerEvent";
import { IDeclareI18n, IReduxConnect } from "./IDeclareComponent";

export type TypeThemeDefault = {
    default: string;
    themePink: string;
};

export interface IComponent<P=Object, S=Object, C=Object> {
    parent?:HTMLElement;
    vdom: IVirtualElement;
    dom: any;
    htmlCode?: string;
    connect?: IReduxConnect;
    i18nConfig?: IDeclareI18n;
    i18nLocale?: string;
    i18nRegion?: string;
    i18nRootKey?: string;
    i18nData?: any;
    propType?: any;
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
    render?():any;
    $willReceiveProps?(propData: P,oldProps: P): void;
    $init?(): void;
    $inject?(): void;
    $before?(): void;
    $beforeVirtualRender?(dom?:IVirtualElement): void;
    $beforeRender?(): boolean;
    $after?(): void;
    $afterVirtualRender?(dom?:IVirtualElement): void;
    $resize?(event:IElmerEvent): void;
    $dispose?(): void;
    $didMount?():void;
    $didUpdate?():void;
    $willMount?(): void;
    addEvent?(handle: any, dom: HTMLElement|Element|Node,eventName: string, callBack:Function, options?:AddEventListenerOptions):void;
    animationEnd?(dom: HTMLElement|Element|Node,callBack:Function):void;
    setData(data: object, refresh?: boolean): Promise<any>;
    /**
     * 修改组件state触发组件重绘
     * @param data any 修改state
     * @param refresh boolean 强制重绘，用于解决修改地址引用变量导致无法检查出state有没有更新
     */
    setState<T>(data: T & P, refresh?: boolean): Promise<any>;
}

export interface IHTMLElementInsertMethod {
    beforeBegin: string;
    afterBegin: string;
    beforeEnd: string;
    afterEnd: string;
}

export class HTMLElementInsertMethod implements IHTMLElementInsertMethod {
    afterBegin: string = "afterBegin";
    afterEnd: string = "afterEnd";
    beforeBegin: string = "beforeBegin";
    beforeEnd: string = "beforeEnd";
}

export const EnumHTMLElementInsertMethod = new HTMLElementInsertMethod();