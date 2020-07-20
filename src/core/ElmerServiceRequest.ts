import axios, { AxiosResponse } from "axios";
import { Common } from "elmer-common";
import { getGlobalConfiguration } from "../configuration";
import { getServiceConfig } from "../configuration/AppServiceConfig";
import { TypeServiceConfig } from "../configuration/TypeGlobalConfig";
import { IServiceConfig, IServiceEndPoint,IServiceRequest, TypeServiceRequestType } from "../interface/IElmerService";

export class ElmerServiceRequest extends Common {
    static className:string = "ElmerServiceRequest";
    private configData:TypeServiceConfig<any, any>;
    private config:any;
    private success: Function|undefined;
    private fail: Function|undefined;
    private complete: Function|undefined;
    private requestResult: object = {};
    private env: string = "Prod";
    constructor() {
        super();
        this.configData = getServiceConfig();
        this.config = this.configData.config;
    }
    /**
     * 调用init方法重新读取配置数据，
     * 由于在只在new constructor的时候读取数据，所以在autowired初始化的时候就做了读取配置的操作
     * 导致没有拿到最新的配置信息,调用当前方法重新获取配置数据
     * @param reload [boolean] 是否强制刷新配置信息
     */
    public init(reload?: boolean): void {
        this.env = getGlobalConfiguration().env || "Prod";
        this.configData = getServiceConfig();
        this.config = this.configData.config;
    }
    /**
     * 手动设置配置参数，覆盖自动从全局配置参数中读取
     * @param configData [TypeServiceConfig<T, K>] Api请求设置参数
     */
    public setConfig<T, K>(configData: TypeServiceConfig<T, K>): void {
        if(configData) {
            this.configData = configData;
            this.config = this.configData.config;
            this.env = getGlobalConfiguration().env || "Prod";
        } else {
            throw new Error("Can not set an empty object to service config");
        }
    }
    public send(data: Array<IServiceRequest<any>>, success?:Function, fail?:Function, complete?:Function, beforeRequest?:Function): void {
        this.success = success;
        this.fail = fail;
        this.complete = complete;
        if(beforeRequest !== undefined && this.isFunction(beforeRequest)) {
            beforeRequest(data);
        }
        if(data && this.isArray(data) && data.length > 0) {
            this.requestResult = {};
            data.map((tmpOption:IServiceRequest<any>) => {
                if(this.isEmpty(tmpOption.id)) {
                    tmpOption.id === this.guid();
                }
                this.requestResult[tmpOption.id] = {
                    status: null,
                    statusText: null
                };
                // tslint:disable-next-line: no-floating-promises
                this.sendRequest(tmpOption);
            });
        } else {
            typeof this.fail === "function" && this.fail({
                status: 500,
                statusText: "请设置发送请求内容！"
            });
            this.requestCompleteCheck();
            // tslint:disable-next-line:no-console
            console.error("请设置发送请求内容！");
        }
    }
    public getUrl(endPointID: string, nameSpace?: string): string {
        let endPoint:IServiceEndPoint<any> = null;
        if(this.isEmpty(nameSpace)) {
            endPoint = this.getValue(this.config.endPoints, endPointID);
        } else {
            const namespaceData:any = this.getValue(this.config, nameSpace);
            endPoint = namespaceData ? this.getValue(namespaceData.endPoints, endPointID) : null;
        }
        if(endPoint) {
            return this.getRequestUrl(endPoint, {
                namespace: nameSpace,
            });
        }
        return "";
    }
    public sendRequest(option:IServiceRequest<any>): Promise<any> {
        const endPoint:IServiceEndPoint<any> = this.getEndPoint(option);
        if(!this.config || Object.keys(this.config).length <=0) {
            this.init(true);
        }
        return new Promise((resolve:Function, reject:Function) => {
            if(endPoint || !this.isEmpty(option.url)) {
                let method: string = this.config.dummy ? "GET" : this.getRequestMethod(option, endPoint);
                const comBeforeResult = this.configData?.common?.onBefore?.(endPoint, option); // 执行配置的全局方法
                endPoint && typeof endPoint.onBefore === "function" && endPoint.onBefore(option, endPoint);
                const reqUrl = this.getRequestUrl(endPoint, option);
                const header = {
                    // "Content-Type" : "application/x-www-from-urlencoded",
                    "Content-Type": "application/json;charset=UTF-8",
                    // "Access-Control-Allow-Origin": "*",
                    ...this.getRequestHeader(endPoint, option)
                };
                let allData:any;
                const contentType = !this.isEmpty(header["Content-Type"]) ? header["Content-Type"] : (header["content-Type"] || header["content-type"]);
                if(/multipart\/form-data/.test(contentType)) {
                    allData = option.data;
                } else {
                    allData = {
                        ...(endPoint && this.isObject(endPoint.data) ? endPoint.data : {}),
                        ...(option && this.isObject(option.data) ? option.data : {})
                    };
                }
                const timeout = option.timeout || 30000;
                const postData = JSON.stringify(allData);
                method = method.toUpperCase();
                if(!this.isEmpty(option.type)) {
                    method = option.type.toUpperCase();
                }
                if(undefined === comBeforeResult || (undefined !== comBeforeResult && comBeforeResult)) {
                    if(!option.skip) {
                        // tslint:enable:no-console
                        axios(reqUrl, {
                            data: postData,
                            headers: header,
                            // withCredentials: true,
                            method,
                            onDownloadProgress:(event:ProgressEvent) => {
                                option.downloadProgress?.(event,option);
                            },
                            onUploadProgress:(event:ProgressEvent) => {
                                option.uploadProgress?.(event, option);
                            },
                            timeout
                        }).then((data:AxiosResponse)=> {
                            const comEvent:any = {};
                            const comResponse = this.configData?.common?.onResponse?.(data, comEvent);
                            if(undefined === comResponse || ( undefined !== comResponse && comResponse)) {
                                this.requestResult[option.id] = {
                                    status: data.status,
                                    statusText: data.statusText
                                };
                                if(data.status === 200) {
                                    endPoint && typeof endPoint.onAfter === "function" && endPoint.onAfter(data);
                                    const result = data.data;
                                    this.responseDataCheck(result);
                                    typeof option.success === "function" && option.success(result, {
                                        endPoint,
                                        headers: data.headers,
                                        request: option,
                                        response: data
                                    });
                                    typeof this.success === "function" && this.success(result, {
                                        endPoint,
                                        headers: data.headers,
                                        request: option,
                                        response: data
                                    });
                                    typeof option.complete === "function" && option.complete({
                                        request: option,
                                        response: data
                                    });
                                    this.requestCompleteCheck();
                                    resolve(result, comResponse, option);
                                } else {
                                    reject({
                                        status: data.status,
                                        statusText: data.statusText
                                    });
                                }
                            }
                        }).catch((err: any) => {
                            const errResult = this.configData.common?.onError?.(err);
                            if(undefined === errResult || (undefined !== errResult && errResult)) {
                                this.requestResult[option.id] = {
                                    status: err.status || 500,
                                    statusText: err.statusText
                                };
                                typeof option.fail === "function" && option.fail(err, option);
                                typeof option.complete === "function" && option.complete(option);
                                typeof this.fail === "function" && this.fail(option.endPoint, err);
                                this.requestCompleteCheck();
                                reject(err);
                            }
                        });
                    } else {
                        const comResponse = this.configData?.common?.onResponse?.(<any>{status:200, statusText: "200 Found"}, {});
                        if(undefined === comResponse || ( undefined !== comResponse && comResponse)) {
                            this.requestResult[option.id] = {
                                status: 200,
                                statusText: "success"
                            };
                            typeof option.complete === "function" && option.complete(option);
                            this.requestCompleteCheck();
                            resolve({});
                        }
                    }
                }
            } else {
                const errData = {
                    status: 600,
                    statusText: "请配置请求参数: " + option.endPoint
                };
                const errResult = this.configData.common?.onError?.(<any>errData);
                if(undefined === errResult || (undefined !== errResult && errResult)) {
                    typeof option.fail === "function" && option.fail(errData);
                    typeof this.fail === "function" && this.fail(option.endPoint, "未配置请求参数！");
                    typeof option.complete === "function" && option.complete(option);
                    this.requestResult[option.id] = errData;
                    this.requestCompleteCheck();
                    // tslint:disable-next-line:no-console
                    console.error("获取请求配置参数错误【"+option.endPoint+"】！");
                    reject(errData);
                }
            }
        });
    }
    async sendRequestAsync(option:IServiceRequest<any>):Promise<any> {
        // tslint:disable-next-line:no-return-await
        return (await this.sendRequest(option));
    }
    private getRequestMethod(option:IServiceRequest<any>, endPoint:IServiceEndPoint<any>):TypeServiceRequestType {
        if(option) {
            if(!this.isEmpty(option["type"])) {
                return option["type"];
            }
            if(!this.isEmpty(option["method"])) {
                return option["method"];
            }
        }
        if(endPoint) {
            if(!this.isEmpty(endPoint.type)) {
                return endPoint.type;
            }
            if(!this.isEmpty(endPoint.method)) {
                return endPoint.method;
            }
        }
        return "GET";
    }
    private getEndPoint(option:IServiceRequest<any>): any {
        if(this.isEmpty(this.config)) {
            this.init();
            // throw new Error("Please call init first");
        }
        if(this.isEmpty(option.namespace) && this.config) {
            return this.getValue(this.config.endPoints, option.endPoint);
        } else {
            const nameSpace:IServiceConfig<any, any> = this.getValue(this.config, option.namespace);
            if(nameSpace) {
                return this.getValue(nameSpace.endPoints, option.endPoint);
            }
        }
    }
    private requestCompleteCheck(): void {
        let isComplete = true;
        Object.keys(this.requestResult).map((tmpRequestID) => {
            const tmpResult = this.requestResult[tmpRequestID];
            if(tmpResult.status == null) {
                isComplete = false;
            }
        });
        isComplete && typeof this.complete === "function" && this.complete();
    }
    private getRequestHeader(endPoint: any, option?: IServiceRequest<any>):any {
        const header = {
            ...(endPoint && endPoint.header ? endPoint.header : {}),
            ...(option && option.header ? option.header : {})
        };
        const result = {};
        if(header) {
            Object.keys(header).map((tmpKey) => {
                let tmpHeaderKey = this.humpToStr(tmpKey);
                tmpHeaderKey = tmpHeaderKey.substr(0,1).toUpperCase() + tmpHeaderKey.substr(1);
                result[tmpHeaderKey] = header[tmpKey];
            });
        }
        return header;
    }
    private getRequestUrl(endPoint:IServiceEndPoint<any>, option?:IServiceRequest<any>): string {
        let reqUrl = "";
        let namespaceData:IServiceConfig<any, any> = this.isEmpty(option.namespace) ? this.config : this.getValue(this.config, option.namespace);
        if(namespaceData.dummy) {
            reqUrl = namespaceData.dummyPath + (endPoint ? endPoint.dummy : "undefined");
        } else {
            if(this.isEmpty(option.url)) {
                const env = this.env;
                let baseUrl = namespaceData.baseUrl;
                if(namespaceData.envUrls && !this.isEmpty(env)) {
                    if(!this.isEmpty(namespaceData.envUrls[env])) {
                        baseUrl = namespaceData.envUrls[env];
                    }
                }
                reqUrl = baseUrl + (endPoint ? endPoint.url : "undefined");
            } else {
                reqUrl = option.url;
                // if opion url is not empty, then use request url from harcode data;
            }
        }
        if((option && option.uri) || (endPoint && endPoint.uri)) {
            const uriArr: any[] = [];
            const uriData = endPoint.uri || {};
            this.extend(uriData, option.uri);
            Object.keys(uriData).map((urlKey)=> {
                const urlValue = uriData[urlKey];
                if(urlValue) {
                    const myValue = encodeURIComponent(urlValue);
                    uriArr.push(urlKey+"="+myValue);
                }
            });
            const uriParam = uriArr.join("&");
            if(/\?/.test(reqUrl)) {
                reqUrl += "&" + uriParam;
            } else {
                reqUrl += "?" + uriParam;
            }
        }
        namespaceData = null;
        const regMatch = reqUrl.match(/^http[s]{0,1}\:\/\//);
        if(regMatch) {
            reqUrl = reqUrl.replace(/^http[s]{0,1}\:\/\//, "");
            reqUrl = reqUrl.replace(/\/\//g,"/");
            reqUrl = regMatch[0] + reqUrl;
        }
        return reqUrl;
    }
    private responseDataCheck(data: any): void {
        if(!data.success && data.toLogin) {
            const toUrl = data.loginUrl;
            if(typeof toUrl === "string" && toUrl.length>0) {
                window.location.href = toUrl;
            }
        }
    }
}
