// tslint:disable:ordered-imports
// tslint:disable-next-line:no-implicit-dependencies
import "./init/global";
// 引入框架必须使用的样式，例如控制dom显示隐藏
import "./widget/style/index.less";

import { getGlobalVar, defineGlobalVar, __extends } from "./init/globalUtil";
import { defineReduxProvider as defineReduxProviderFn, createReducer,defineStateOperateAction,defineReducer,ReduxController } from "elmer-redux";
import { injectable, autowired } from "./inject/injectable";
import { propTypes } from "./propsValidation";
import { setServiceEnv } from "./configuration/GlobalConfig";
import { ElmerServiceRequest } from "./domEvent/ElmerServiceRequest";

export const defineReduxProvider = defineReduxProviderFn;
// export const redux = {
//     ReduxController,
//     createReducer,
//     defineReducer,
//     defineReduxProvider,
//     defineStateOperateAction
// };
export * from "./init/globalUtil";
export * from "./domEvent/ElmerDom";
export * from "./inject";
export * from "./propsValidation";
export * from "./domEvent/ElmerServiceRequest";
export * from "./configuration";
export * from "./animation/ElmerAnimation";
export * from "./configuration";
// ---------import widget 注册所有组件 ----------
export * from "./widget";
// tslint:enable:ordered-imports
elmerData.extends = __extends;
elmerData.propTypes = propTypes;
elmerData.autowired = autowired;
elmerData.Injectable = injectable;
elmerData.ServiceHelper = ElmerServiceRequest;
// elmerData["redux"] = redux;
elmerData.setEnv = setServiceEnv;
