// tslint:disable:ordered-imports
// tslint:disable-next-line:no-implicit-dependencies
import "./init/global";
// 引入框架必须使用的样式，例如控制dom显示隐藏
import "./widget/style/index.less";

import { getGlobalVar, defineGlobalVar, __extends } from "./init/globalUtil";
import { defineReduxProvider as defineReduxProviderFn, createReducer,defineStateOperateAction,defineReducer,ReduxController } from "elmer-redux";
import { declareComponent,Injectable, autowired } from "./inject/injectable";
import { connect } from "./widget/redux/connect";
import { propTypes } from "./propsValidation";
import { setServiceEnv } from "./configuration/GlobalConfig";
import { ElmerServiceRequest } from "./core/ElmerServiceRequest";

export const defineReduxProvider = defineReduxProviderFn;
export const redux = {
    ReduxController,
    connect,
    createReducer,
    defineReducer,
    defineReduxProvider,
    defineStateOperateAction
};
export * from "./init/globalUtil";
export * from "./core/ElmerDom";
export * from "./core/ElmerResize";
export * from "./core/IElmerInterface";
export * from "./core/elmerRegister";
export * from "./core/ElmerVirtualRender";
export * from "./inject";
export * from "./propsValidation";
export * from "./core/ElmerServiceRequest";
export * from "./configuration";
export * from "./i18n";
export * from "./animation/ElmerAnimation";
export * from "./configuration";
// ---------import widget 注册所有组件 ----------
export * from "./widget";
// tslint:enable:ordered-imports
elmerData.extends = __extends;
elmerData.propTypes = propTypes;
elmerData.autowired = autowired;
elmerData.Injectable = Injectable;
elmerData.declareComponent = declareComponent;
elmerData.ServiceHelper = ElmerServiceRequest;
elmerData["redux"] = redux;
elmerData.setEnv = setServiceEnv;
