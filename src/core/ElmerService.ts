import axios, { AxiosBasicCredentials } from "axios";
import { StaticCommon as utils } from "elmer-common";
import { createContext } from "../context";
import { autoInit, injectable } from "../injectable";

type TypeServiceMethod = "GET" | "POST" | "DELETE" | "PUT" | "OPTIONS";

type TypeServiceEndPointOption = {
    withRoute?: boolean;
    withRouteAction?: string;
    withRoutePath?: string;
};

type TypeServiceEndPoint<T> = {
    url: string | any;
    method: TypeServiceMethod,
    uri?: any;
    data?: any;
    cookie?: any;
    header?: any;
    withCredentials?: boolean;
    auth?: AxiosBasicCredentials;
    options?: TypeServiceEndPointOption;
    isDummy?: boolean;
    dummyData?: string;
};

type TypeServiceNamespace<T>= {
    host?: any;
    isDummy?: boolean;
    endPoints: {[P in keyof T]: TypeServiceEndPoint<any>};
};

type TypeServiceConfig<T={}> = {
    env?: string;
    isDummy?: boolean;
    host: any;
    config: {[P in keyof T]: TypeServiceNamespace<any>};
    timeout?: number;
};

type TypeServiceSendOptions = {
    endPoint: string;
    uri?: any;
    data?: any;
    header?: any;
    cookie?: any;
    withCredentials?: boolean;
};

const [serviceState, withServiceContext,] = createContext("ElmerServiceContext", {
    config: {}
});

@injectable("/core/ElmerService")
export class ElmerService {
    private config: {[P in keyof TypeServiceConfig<any>]?: TypeServiceConfig<any>[P]} = {};
    setConfig(configData: TypeServiceConfig<any>): void {
        this.config = configData;
        serviceState.config = configData;
    }
    getConfig<T = any>(): {[P in keyof T]: TypeServiceNamespace<any>} {
        return this.config.config as any;
    }
    getEndPoint(endPointId: string): TypeServiceEndPoint<any>|undefined|null {
        const endArr = (endPointId || "").split(".");
        const namespace = endArr[0];
        const id = endArr[1];
        const allConfig = this.config?.config;
        const namespaceData = allConfig ? allConfig[namespace] : null;
        if(namespaceData) {
            const endPointConfig = (namespaceData.endPoints || {})[id];
            if(endPointConfig) {
                const endPoint = JSON.parse(JSON.stringify(endPointConfig));
                const isDummy = this.config.isDummy || namespaceData.isDummy || endPoint.isDummy;
                const env = this.config.env || "PROD";
                const rootHost = (this.config.host || {})[env];
                const namespaceHost = (namespaceData.host || {})[env];
                const domainPath = namespaceHost || rootHost;
                let url = endPoint.url;
                if(utils.isObject(endPoint.url)) {
                    url = endPoint.url[env];
                }
                if(isDummy) {
                    url = endPoint.dummyData || url; // 如果未设置dummy数据路径，fallback回之前的设置
                } else {
                    url = domainPath + url;
                }
                if(utils.isObject(endPoint.uri)) { // 将自定义参数合并到连接
                    url = this.mergeLinkAndUri(url, endPoint.uri);
                }
                endPoint.url = url;
                return endPoint;
            }
        }
    }
    getUrl(endPointId: string): string|undefined|null {
        const endPoint = this.getEndPoint(endPointId);
        return endPoint ? endPoint.url : null;
    }
    send<T = {}>(options: TypeServiceSendOptions): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const endPoint = this.getEndPoint(options?.endPoint);
            if(!endPoint) {
                reject({
                    message: "The endpoint is not found.",
                    status: "IT-500"
                });
            }
            const sendData = {
                ...(endPoint.data || {}),
                ...(options.data || {})
            };
            const url = utils.isObject(options.uri) ? this.mergeLinkAndUri(endPoint.url, options.uri) : endPoint.url;
            const type = endPoint.method || "GET";
            const headers = {
                ...(endPoint.header || {}),
                ...(options.header || {})
            };
            const cookieData = {
                ...(endPoint.cookie || {}),
                ...(options.cookie || {})
            };
            this.setCookies(cookieData);
            axios.request({
                auth: endPoint.auth,
                data: sendData,
                headers,
                method: type,
                timeout: this.config.timeout || 30000,
                url,
                withCredentials: options.withCredentials || endPoint.withCredentials
            }).then((resp) => {
                resolve(({
                    config: endPoint,
                    data: resp.data,
                    endPoint,
                    headers: resp.headers,
                    options  
                } as any));
            }).catch((error) => {
                // tslint:disable-next-line: no-console
                console.error(error);
                reject(error);
            });
        });
    }
    private setCookies(cookieData): void {
        if(cookieData) {
            Object.keys(cookieData).map((cookieKey) => {
                const value = cookieData[cookieKey];
                const setValue = utils.isObject(value) ? JSON.stringify(value) : value;
                const cookieValue = `${cookieKey}=${encodeURIComponent(setValue)}`;
                document.cookie = cookieValue;
            });
        }
    }
    /**
     * 将url和uri参数合并
     * @param url 源连接
     * @param uri 合并参数
     * @returns 合并后的链接
     */
    private mergeLinkAndUri(url: string, uri: any): string {
        const uriQuery = this.uriToQuery(uri);
        return !/\?/.test(url) ? url + "?" + uriQuery :
            (/#/.test(url) ? (url as string).replace(/#/, "#" + uriQuery) :
            url + "&" + uriQuery);
    }
    private uriToQuery(uri: any): string {
        const rList: string[] = [];
        if(utils.isObject(uri)) {
            Object.keys(uri).map((item: string) => {
                const itemValue = uri[item];
                const itemV = utils.isObject(itemValue) ? JSON.stringify(itemValue) : itemValue;
                const itemQV = encodeURIComponent(itemV);
                rList.push(`${item}=${itemQV}`);
            });
        }
        return rList.join("&");
    }
}

export const GetUrl = (endPoint: string) => {
    return (target: any, attr: string, defaultValue?: any): any => {
        const obj = autoInit(ElmerService);
        const myUrl = obj.getUrl(endPoint);
        if(target) {
            Object.defineProperty(target, attr, {
                get: () => myUrl,
                set: () => {throw new Error(`The property of ${attr} cannot be modified directly.`);}
            });
        }
        return myUrl;
    };
};

export const GetEndPoint= (endPoint: string) => {
    return (target: any, attr: string, defaultValue?: any): any => {
        const obj = autoInit(ElmerService);
        const myEndPoint = obj.getEndPoint(endPoint);
        if(target) {
            Object.defineProperty(target, attr, {
                get: () => myEndPoint,
                set: () => {throw new Error(`The property of ${attr} cannot be modified directly.`);}
            });
        }
        return myEndPoint;
    };
};
