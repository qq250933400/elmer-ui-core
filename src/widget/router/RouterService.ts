import { Common } from "elmer-common";
import { ElmerServiceRequest } from "../..";
import { getRouterConfig } from "../../configuration/RouterServiceConfig";
import { defineGlobalState, getGlobalState } from "../../init/globalUtil";
import { IRouter } from "../../interface/IDeclareComponentOptions";
import { IServiceEndPoint, IServiceRequest } from "../../interface/IElmerService";

export type TypeRouterServiceOptions = {
    path?: string | RegExp;
    reduxActionType?: String; // this attribute is for save data to redux store
};

export const ROUTER_SKIP_API_ACTION = "239b24b2-687a-1405-0c91-6085db4e";

type TypeRouterLoadingEvent = {
    loaded?: number;
    total?: number;
};
type TypeRouterAjaxAllOptions = {
    option?: any;
    onDownloadProgress?(event: TypeRouterLoadingEvent, option?:any): void;
    onCompleted?(option?:any): void;
};

export class RouterService extends Common {
    static className:string = "RouterService";
    routers: IRouter[];
    toUrl: string;

    public hashRouter: boolean = true;

    private target:any;

    private http:ElmerServiceRequest = new ElmerServiceRequest(); // 路由需要创建一个独立的serviceRequest

    constructor() {
        super();
        if(!getGlobalState("euiRouter")) {
            defineGlobalState("euiRouter", {
                hashRouter: false,
                title: "euiRouter",
                toParams: null,
                version: "1.0.0"
            }, true);
        }
        this.toUrl = window.location.href || "";
        this.handleOnHashChange();
    }
    initConfig(routeData:IRouter[], hashRouter: boolean): void {
        this.routers = routeData || [];
        this.hashRouter = hashRouter;
    }
    setBindRouteComponent(target:any): void {
        this.target = target;
    }
    setState(updateState: any): void {
        this.target.setState(updateState, true);
    }
    refreshUrl(updateUrl: string): void {
        if(!this.isEmpty(updateUrl)) {
            this.toUrl = updateUrl;
        } else {
            this.toUrl = window.location.href || "";
        }
    }
    checkRoutersVisible(newUrl: string, oldUrl:string, param:any): IRouter {
        const locationUrl = newUrl || "";
        if(this.isArray(this.routers)) {
            const routeUrl = this.getRoutePathValue(locationUrl);
            const checkRouters = this.routers;
            for(let i=0;i<checkRouters.length;i++) {
                const tmpRouter = checkRouters[i];
                const tmpProps: any = tmpRouter.props || {};
                tmpProps.if = false;
                if(this.isString(tmpRouter.path)) {
                    let checkPath:string = tmpRouter.path || "";
                    const queryIndex = checkPath.indexOf("?");
                    const newQueryData = this.getQueryDataFromUrl(locationUrl);
                    checkPath = queryIndex >= 0 ? checkPath.substr(0, queryIndex) : checkPath;
                    if(checkPath === routeUrl) {
                        tmpProps.if = true;
                        return {
                            component: tmpRouter.component,
                            path: tmpRouter.path,
                            props: {
                                ...tmpProps,
                                ...newQueryData,
                                ...(param || {})
                            }
                        };
                    } else if((this.isEmpty(routeUrl) || routeUrl==="/") && tmpRouter.path === "/") {
                        tmpProps.if = true;
                        return {
                            component: tmpRouter.component,
                            path: tmpRouter.path,
                            props: {
                                ...tmpProps,
                                ...(param || {})
                            }
                        };
                    }
                } else if(this.isRegExp(tmpRouter.path)) {
                    // 开启正则匹配
                    if(tmpRouter.path.test(routeUrl)) {
                        tmpProps.if = true;
                        return {
                            component: tmpRouter.component,
                            path: tmpRouter.path,
                            props: {
                                ...tmpProps,
                                ...(param || {})
                            }
                        };
                    }
                }
            }
        }
        return {
            component: "eui-404",
            path: "/404",
            props: {
                if: true
            }
        };
    }
    getPageCode(router:IRouter): string {
        if(!this.isEmpty(router.component)) {
            let tagName = this.humpToStr(router.component);
            tagName = !/^(eui\-)/.test(tagName) ? "eui-" + tagName : tagName;
            let result = "<" + tagName;
            if(router.props) {
                Object.keys(router.props).map((tmpKey) => {
                    const bindKey = "{{nextPage.props."+ tmpKey +"}}";
                    result += " " + tmpKey + "='" + bindKey + "'";
                });
            }
            result += "></" + tagName + ">";
            return result;
        } else {
            return "";
        }
    }
    onHashChanged(res:any): void {
        if(this.target && this.isFunction(this.target.onRouterChanged)) {
            this.target.onRouterChanged(res.newURL, res.oldURL, res.param);
        }
    }
    getToRouter(toUrl: string): any {
        if(this.isArray(this.routers)) {
            const routeUrl = this.getRoutePathValue(toUrl);
            for(let i=0;i<this.routers.length;i++) {
                const tmpRouter = this.routers[i];
                if(this.isString(tmpRouter.path)) {
                    if(tmpRouter.path === routeUrl) {
                        return tmpRouter;
                    } else if((this.isEmpty(routeUrl) || routeUrl==="/") && tmpRouter.path === "/") {
                        return tmpRouter;
                    }
                } else if(this.isRegExp(tmpRouter.path)) {
                    // 开启正则匹配
                    if((tmpRouter.path).test(routeUrl)) {
                        return tmpRouter;
                    }
                }
            }
        }
    }
    getRouterRequests(router:IRouter): any {
        const config = getRouterConfig<any,TypeRouterServiceOptions>();
        const serviceConfig = config.service;
        const resultApi:any = {};
        if(serviceConfig.config && router) {
            // tslint:disable-next-line: forin
            for(const key in serviceConfig.config) {
                const itemData = serviceConfig.config[key];
                if(itemData.endPoints) {
                    // tslint:disable-next-line: forin
                    for(const endPointKey in itemData.endPoints) {
                        const itemEndPoint = itemData.endPoints[endPointKey];
                        if(itemEndPoint.options.path === router.path || ((router.path === "/" || this.isEmpty(router.path)) && (itemEndPoint.options.path === "/" || this.isEmpty(itemEndPoint.options.path)))) {
                            if(resultApi[key]) {
                                resultApi[key].push(endPointKey);
                            } else {
                                resultApi[key] = [endPointKey];
                            }
                        }
                    }
                }
            }
        }
        return resultApi;
    }
    ajaxAll<T>(apiData: any, options?: TypeRouterAjaxAllOptions): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const config = getRouterConfig<any,TypeRouterServiceOptions>();
            const serviceConfig = config.service;
            const allSend:Array<IServiceRequest<any>> = [];
            const allStatus = {};
            let allPercent = 100.0;
            let loaded = 0;

            // tslint:disable-next-line: forin
            for(const namespace in apiData) {
                const endPoints = apiData[namespace] || [];
                for(let i = 0;i < endPoints.length; i ++) {
                    allSend.push({
                        endPoint: endPoints[i],
                        namespace,
                        options: {
                            key: i
                        },
                        success: (resp:any, events: any) => {
                            const endPoint:IServiceEndPoint<TypeRouterServiceOptions> = events.endPoint;
                            if(this.isEmpty(endPoint.options.reduxActionType)) {
                                // tslint:disable-next-line: no-console
                                console.error("保存请求数据:失败未设置reduxActionType", endPoint);
                            } else {
                                if(typeof this.target?.props?.updateApiData === "function") {
                                    this.target?.props?.updateApiData(endPoint.options.reduxActionType, resp);
                                } else {
                                    console.log(this.target);
                                    // tslint:disable-next-line: no-console
                                    console.error("RouterService错误的调用");
                                }
                            }
                        },
                        // tslint:disable-next-line: object-literal-sort-keys
                        downloadProgress:(event, res:IServiceRequest<any>):void => {
                            loaded = this.calcAllRequestProgress(event.loaded, event.total, allStatus, res?.options?.key);
                            typeof options?.onDownloadProgress?.({
                                loaded,
                                total: allPercent
                            }, options.option);
                        },
                        complete: (res:any) => {
                            loaded = this.calcAllRequestProgress(100, 100, allStatus, res?.options?.key);
                            typeof options?.onDownloadProgress?.({
                                loaded,
                                total: allPercent
                            }, options?.option);
                        }
                    });
                }
            }
            allPercent = (allSend.length) * 100;
            this.http.setConfig(serviceConfig);
            this.http.send(allSend, (resp) => {
                resolve(options?.option);
            }, (err) => {
                reject(options?.option);
            }, () => {
                options?.onCompleted?.(options?.option);
                resolve(options?.option);
            });
        });
    }
    private handleOnHashChange(): void {
        const myState = getGlobalState("euiRouter");
        const pushState = history.pushState;
        history.pushState = (data:any, title: string, url?:string) => {
            this.onHashChanged({
                newURL: url,
                oldURL: location.href,
                param: data
            });
            return pushState.apply(history, [data, title, url]);
        };
        if("onhashchange" in window) {
            window.onhashchange = this.onHashChanged.bind(this);
        } else {
            // tslint:disable-next-line:no-console
            console.error("Your browser not support onHashChanged");
        }
        this.setValue(myState, "onLocationChanged", this.onHashChanged.bind(this));
    }
    private calcAllRequestProgress(curLoaded:number, curTotal:number, allStatus: any, id: number|string):number {
        const curPercent = parseFloat((curLoaded / curTotal).toFixed(4));
        let progress = 0;
        allStatus[id] = parseInt(Math.ceil(curPercent * 100).toFixed(0), 10);
        // tslint:disable-next-line: forin
        for(const key in allStatus) {
            progress += allStatus[key];
        }
        return progress;
    }
    private getQueryDataFromUrl(url: string): any {
        const queryIndex = url.indexOf("?");
        const result = {};
        if(queryIndex>=0) {
            const queryStr = url.substr(queryIndex + 1);
            const queryArr = queryStr.split("&");
            for(const tmpQuery of queryArr) {
                const tmpMatch = tmpQuery.match(/([a-z0-9%\-]*)\=([a-z0-9%\s\-\+_]*)/i);
                if(tmpMatch) {
                    result[tmpMatch[1]] = tmpMatch[2];
                }
            }
        }
        return result;
    }
    private getRoutePathValue(urlStr:string): string {
        if(!this.isEmpty(urlStr)) {
            if(this.hashRouter) {
                const lIndex = !this.isEmpty(urlStr) ? urlStr.indexOf("#") : -1;
                if(lIndex>=0) {
                    let result = lIndex>=0 ? urlStr.substr(lIndex+1) : urlStr;
                    const qIndex = result.indexOf("?");
                    result = qIndex > 0 ? result.substr(0,qIndex) : result;
                    return result;
                } else {
                    return "";
                }
            } else {
                const qIndex = urlStr.indexOf("?");
                let url = qIndex >= 0 ? urlStr.substr(0, qIndex) : urlStr;
                url = url.replace(/(http|https)\:\/\//i, "");
                const imIndex = url.indexOf("/");
                return imIndex > 0 ? url.substr(0, imIndex) : url;
            }
        } else {
            return "";
        }
    }
}
