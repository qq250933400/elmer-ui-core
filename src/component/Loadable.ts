import { StaticCommon as utils } from "elmer-common";
import { useComponent, useEffect, useState } from "../hooks";

type TypeLoadableOptions = {
    loader: Function;
    loading?: Function;
    error?: Function;
    className?: string;
};

const defaultLoading = () => {
    return `<div style="display: inline-block;width: 48px;height: 48px;text-align: center; padding: 20px;" data-type="html"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="48px" height="60px" viewBox="0 0 24 30" style="enable-background:new 0 0 50 50" xml:space="preserve">
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
    const [{}, setStatusInfo] = useState("statusInfo", {
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
        const [{}, setLoaded] = useState("loaded", false);
        const [ appId ] = useState("asyncAppId", "__AsyncAppId__" + utils.guid());
        const [{}, setStatus] = useState("loadStatus", {
            message: "Ok",
            showError: false,
            statusCode: "200"
        });
        const useNewComponent = useComponent("AsyncComponent", options.loading || defaultLoading);
        useComponent("ErrorInfo", options.error || defaultError);
        useComponent("Loading", options.loading || defaultLoading);
        useState("className", options.className);
        useEffect((name):any => {
            if(name === "didMount") {
                if(typeof options.loader === "function") {
                    options.loader().then((resp:any) => {
                        if(resp["__esModule"] && typeof resp.default === "function") {
                            const AsyncComponet= resp.default;
                            useNewComponent(AsyncComponet);
                            setStatus({
                                showError: false
                            });
                        } else {
                            setStatus({
                                message: "AsyncComponent module not an function or constructor.",
                                showError: true,
                                statusCode: "Async500"
                            });
                        }
                        setLoaded(true);
                    }).catch((err) => {
                        // tslint:disable-next-line: no-console
                        console.error(err);
                        setStatus({
                            message: "Load asyncComponent fail: " + err.message,
                            showError: true,
                            statusCode: "Async500"
                        });
                        setLoaded(true);
                    });
                }
            }
        });
        return `<div>
            <AsyncComponent if="{{state.loaded eq true && state.loadStatus.showError eq false}}" id="{{state.asyncAppId}}" status="{{state.loaded}}"/>
            <Loading if="{{state.loaded eq false}}"/>
            <ErrorInfo if="{{state.loadStatus.showError}}" message="{{state.loadStatus.message}}" statusCode="{{state.loadStatus.statusCode}}"/>
        </div>`;
    };
};
