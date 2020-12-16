export type TypeReduxAction<T> = {
    type: string;
    data: T;
};
export type TypeReduxReducer<T> = {
    name: string;
    callback: { [P in keyof T]: <A>(state:any, action:TypeReduxAction<A>) => any }
}

export interface IRouter {
    path: string | RegExp;
    props?: any;
    component?: string;
}

export interface IReduxConnect<T={}> {
    mapStateToProps?: Function;
    mapDispatchToProps?: Function;
    reducers?: TypeReduxReducer<T>[];
}
export interface IDeclareI18nData {
    en?: object;
    zh?: object;
}
export interface IDeclareI18n {
    locale?: string;
    data?: IDeclareI18nData | any;
    key?: string;
}
export interface ITemplateConfig {
    url?: string;
    isEndPoint?: boolean;
    fromLoader?: boolean;
    htmlCode?: any;
    timeout?: number;
    ajaxType?: "GET" | "POST";
}
export interface IDeclareComponent {
    selector: string;
    component: Function;
}
export interface IDeclareComponentOptions {
    /**
     * 定义组件tagName
     */
    selector: string;
    /**
     * 定义注入service模块，service模块必须是injecable模块
     */
    service?: object;
    /**
     * 注入模块配置,配置为key+Class
     */
    model?: object;
    template?: ITemplateConfig;
    /**
     * Redux定义参数
     */
    connect?: IReduxConnect;
    components?: IDeclareComponent[]|any;
    /**
     * 定义i18n特殊设置
     */
    i18n?: IDeclareI18n;
    /**
     * 应用Router设置
     */
    withRouter?: boolean;
}

export type TypeDefineContextListener = {
    listenId: string;
    callBack: Function;
};
export type TypeDefineContextData<T> = {
    listener: TypeDefineContextListener;
    storeData: T;
};
