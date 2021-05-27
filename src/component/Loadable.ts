import { queueCallFunc, queueCallRaceAll,StaticCommon as utils, TypeQueueCallParam } from "elmer-common";
import { classNames } from "../core/ElmerDom";
import { ElmerService, TypeServiceSendOptions } from "../core/ElmerService";
import { useComponent, useEffect, useService, useState } from "../hooks";

type LoadableEndPoints<T={}> = {[P in keyof T]: TypeServiceSendOptions};

type TypeLoadableOptions<T={}> = {
    loader: Function;
    loading?: Function;
    error?: Function;
    className?: string;
    callApis?: {
        /** 是否异步请求 */
        async?: boolean;
        after?: Function;
        before?: Function;
        endPoints: LoadableEndPoints;
    }
};

const defaultLoading = () => {
    return `<div style="display: inline-block;width: 48px;height: 48px;text-align: center; padding: 20px;" data-type="htmlx">
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="48px" height="60px" viewBox="0 0 24 30" style="enable-background:new 0 0 50 50" xml:space="preserve">
        <rect x="0" y="9.22656" width="4" height="12.5469" fill="#FF6700">
            <animate attributeName="height" attributeType="XML" values="5;21;5" begin="0s" dur="0.6s" repeatCount="indefinite"></animate>
            <animate attributeName="y" attributeType="XML" values="13; 5; 13" begin="0s" dur="0.6s" repeatCount="indefinite"></animate>
        </rect>
        <rect x="10" y="5.22656" width="4" height="20.5469" fill="#FF6700">
            <animate attributeName="height" attributeType="XML" values="5;21;5" begin="0.15s" dur="0.6s" repeatCount="indefinite"></animate>
            <animate attributeName="y" attributeType="XML" values="13; 5; 13" begin="0.15s" dur="0.6s" repeatCount="indefinite"></animate>
        </rect>
        <rect x="20" y="8.77344" width="4" height="13.4531" fill="#FF6700">
            <animate attributeName="height" attributeType="XML" values="5;21;5" begin="0.3s" dur="0.6s" repeatCount="indefinite"></animate>
            <animate attributeName="y" attributeType="XML" values="13; 5; 13" begin="0.3s" dur="0.6s" repeatCount="indefinite"></animate>
        </rect>
    </svg></div>`;
};

const defaultError = ({message, statusCode, showCode}) => {
    const [setStatusInfo] = useState("statusInfo", {
        message,
        showCode,
        statusCode
    });
    useEffect((name, { props }):any => {
        if(name === "willReceiveProps") {
            setStatusInfo({
                message: (props as any).message,
                showCode: (props as any).showCode,
                statusCode: (props as any).statusCode
            });
        }
    });
    return `<label style="display: block;padding: 8px 15px; border: 1px solid red;background: #fff1f3;position: relative;font-size: 0;padding-left: 34px;">
        <div style="display: block;width: 20px;height: 20px;position: absolute;left: 6px;top:8px;color: #fff; background: #f75757;border-radius: 100%;-webkit-border-radius: 100%;overflow: hidden;">
            <div style="display: block;position: relative; width: 100%;height: 100%;">
                <span style="display: block;font-weight: bold;font-size: 18px;text-align: center;line-height: 20px;">!</span>
            </div>
        </div>
        <span style="display: inline-block;font-size: 14px;vertical-align: middle;">{{state.statusInfo.message}}</span>
        <i style="display: inline-block;font-size: 14px;vertical-align: middle;font-style: normal;"> [{{state.statusInfo.statusCode}}]</i>
    </label>`;
};

export const Loadable = (options: TypeLoadableOptions) => {
    return () => {
        const [ setStatus, getStatus] = useState("loadStatus", {
            apiData: null,
            loaded: false,
            message: "Ok",
            showError: false,
            showLoading: true,
            statusCode: "200"
        });
        const useNewComponent = useComponent("AsyncComponent", options.loading || defaultLoading);
        const service = useService<ElmerService>(ElmerService);
        useComponent("ErrorInfo", options.error || defaultError);
        useComponent("Loading", options.loading || defaultLoading);
        useState("className", classNames("Loadable", options.className));
        useState("asyncAppId", "__AsyncAppId__" + utils.guid());
        useEffect((name):any => {
            if(name === "didMount") {
                if(typeof options.loader === "function") {
                    queueCallFunc([
                        {
                            id: "call_apis",
                            params: options.callApis,
                            // tslint:disable-next-line: object-literal-sort-keys
                            fn: ():any => {
                                return new Promise<any>((resolve, reject) => {
                                    if(options?.callApis?.endPoints && Object.keys(options?.callApis?.endPoints).length > 0) {
                                        const params: TypeQueueCallParam[] = [];
                                        const apiInvoke = options.callApis.async ? queueCallRaceAll : queueCallFunc;
                                        Object.keys(options?.callApis?.endPoints).map((id: string) => {
                                            const sendOption: TypeServiceSendOptions = options?.callApis?.endPoints[id];
                                            params.push({
                                                id,
                                                params: sendOption
                                            });
                                        });
                                        apiInvoke(params, (opt, invokeParam): Promise<any> => {
                                            // tslint:disable-next-line: variable-name
                                            return new Promise((_resolve, _reject) => {
                                                typeof options?.callApis?.before === "function" && options?.callApis?.before(invokeParam, opt);
                                                service.send(invokeParam)
                                                    .then((resp: any) => {
                                                        if(typeof options?.callApis?.after === "function") {
                                                            _reject(options?.callApis?.after(true, resp));
                                                        } else {
                                                            _reject(resp);
                                                        }
                                                    })
                                                    .catch((respError) => {
                                                        if(typeof options?.callApis?.after === "function") {
                                                            _reject(options?.callApis?.after(false, respError));
                                                        } else {
                                                            _reject(respError);
                                                        }
                                                    });
                                            });
                                        }, {
                                            throwException: true
                                        })
                                            .then((allResp:any) => resolve(allResp))
                                            .catch((apiError: any) => reject(apiError));
                                    } else {
                                        resolve({});
                                    }
                                });
                            }
                        }, {
                            id: "loadComponent",
                            params: null,
                            // tslint:disable-next-line: object-literal-sort-keys
                            fn: () => {
                                return new Promise((resolve, reject) => {
                                    options.loader().then((resp:any) => {
                                        if(resp["__esModule"] && typeof resp.default === "function") {
                                            const AsyncComponet= resp.default;
                                            const lastStatus = getStatus();
                                            useNewComponent(AsyncComponet);
                                            setStatus({
                                                ...lastStatus,
                                                loaded: true,
                                                showError: false,
                                                showLoading: false,
                                            });
                                            resolve({});
                                        } else {
                                            setStatus({
                                                loaded: true,
                                                message: "AsyncComponent module not an function or constructor.",
                                                showError: true,
                                                showLoading: false,
                                                statusCode: "Async500"
                                            });
                                            resolve({});
                                        }
                                        // setLoaded(true);
                                    }).catch((err) => {
                                        // tslint:disable-next-line: no-console
                                        console.error(err);
                                        reject({
                                            message: "Load asyncComponent fail: " + err.message,
                                            statusCode: "Async500",
                                        });
                                    });
                                });
                            }
                        }
                    ], null, {
                        throwException: true
                    }).then((allResp: any) => {
                        setStatus({
                            ...getStatus(),
                            apiData: allResp.call_apis,
                            showLoading: false
                        });
                    }).catch((error) => {
                        if(utils.isEmpty(error.statusCode) || !utils.isEmpty(error.message)) {
                            setStatus({
                                ...getStatus(),
                                loaded: true,
                                message: error.message,
                                showError: true,
                                showLoading: false
                            });
                        } else {
                            // tslint:disable-next-line: no-console
                            console.error(error);
                        }
                    });
                } else {
                    throw new Error("The attribute of loader is not an function.");
                }
            }
        });
        return `<div data="Loadable" class="{{state.className}}">
            <div class="AsyncComponent"><AsyncComponent em:if="state.loadStatus.loaded seq true && state.loadStatus.showError sneq true" ...="{{props}}" id="{{state.asyncAppId}}" status="{{state.loadStatus.loaded}}"/></div>
            <div class="LoadableLoading"><Loading em:if="state.loadStatus.showLoading"/></div>
            <div class="ErrorInfo"><ErrorInfo if="{{state.loadStatus.showError}}" message="{{state.loadStatus.message}}" statusCode="{{state.loadStatus.statusCode}}"/></div>
        </div>`;
    };
};
