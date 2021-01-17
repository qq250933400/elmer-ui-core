import { IVirtualElement } from "elmer-virtual-dom";
import { IDeclareConnect, IDeclareI18n } from "./IDeclareComponentOptions";

export type TypeThemeDefault = {
    default: string;
    themePink: string;
};

export interface IComponent<P=Object, S=Object, C=Object> {
    parent?:HTMLElement;
    domList: any;
    dom: any;
    htmlCode?: string;
    connect?: IDeclareConnect;
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
    render():any;
    insertAdjacentElement(refElement:HTMLElement|Element|Node, newElement:HTMLElement|Element|Node, InsertMethod: string):void;
    checkPropTypes?(checkPropTypesConfig: any): void;
    $contextData?(context:any): void;
    $willReceiveProps?(propData: any,oldProps: any): void;
    $init?(): void;
    $inject?(): void;
    $before?(): void;
    $beforeVirtualRender?(dom?:IVirtualElement): void;
    $beforeDiff?(dom?:IVirtualElement): void;
    $beforeRender?(): boolean;
    $after?(): void;
    $afterVirtualRender?(dom?:IVirtualElement): void;
    $afterDiff?(dom?:IVirtualElement): void;
    $resize?(): void;
    $dispose?(): void;
    $didMount?():void;
    $didUpdate?():void;
    $willMount?(): void;
    addEvent?(handle: any, dom: HTMLElement|Element|Node,eventName: string, callBack:Function, options?:AddEventListenerOptions):void;
    animationEnd?(dom: HTMLElement|Element|Node,callBack:Function):void;
    setData(data: object, refresh?: boolean): void;
    /**
     * 修改组件state触发组件重绘
     * @param data any 修改state
     * @param refresh boolean 强制重绘，用于解决修改地址引用变量导致无法检查出state有没有更新
     */
    setState(data: object, refresh?: boolean): void;
    /**
     * 修改全局样式
     * @param theme string 样式className
     */
    setTheme<T>(theme: keyof T | keyof TypeThemeDefault, themeConfig?: T): void;
    /**
     * 使用withRouter执行过的对象挂载的方法，用于触发router跳转
     * @param path string 跳转路径
     * @param params any 传递参数
     */
    redirect?(path:string, params?: any):void;
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
