export interface IRouter {
    path: string | RegExp;
    props?: any;
    component?: string;
}

export interface IDeclareConnect {
    mapStateToProps?: Function;
    mapDispatchToProps?: Function;
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
    connect?: IDeclareConnect;
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
