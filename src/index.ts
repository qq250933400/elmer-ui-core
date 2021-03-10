// tslint:disable:ordered-imports
// tslint:disable-next-line:no-implicit-dependencies
// import "./init/global";
import { injectable, autowired } from "./inject/injectable";
import { declareComponent } from "./component/declareComponent";
import { Component } from "./component/Component";
import { propTypes } from "./propsValidation";
import { __extends } from "./init/globalUtil";

import { setServiceEnv } from "./configuration/GlobalConfig";
import { ElmerServiceRequest } from "./domEvent/ElmerServiceRequest";

export * from "./init/globalUtil";
export * from "./domEvent/ElmerDom";
export * from "./inject";
export * from "./animation/ElmerAnimation";
// ---------import widget 注册所有组件 ----------
// tslint:enable:ordered-imports
// elmerData.extends = __extends;
// elmerData.PropTypes = propTypes;
// elmerData.autowired = autowired;
// elmerData.injectable = injectable;
// elmerData.ServiceHelper = ElmerServiceRequest;
// elmerData.setEnv = setServiceEnv;
// elmerData.declareComponent = declareComponent;
// elmerData.Component = Component;
