import { StaticCommon } from "elmer-common";
import { IServiceConfig, IServiceEndPoint } from "../interface/IElmerService";
import { getGlobalConfiguration } from "./GlobalConfig";
import { TypeServiceConfig } from "./TypeGlobalConfig";

export const getServiceConfig = <ServiceConfig, ServiceConfigOptions>():TypeServiceConfig<ServiceConfig, ServiceConfigOptions> => {
    const globalConfig = getGlobalConfiguration<ServiceConfig,ServiceConfigOptions, unknown, unknown, unknown, unknown, unknown, unknown>();
    return globalConfig.service;
};

export const setServiceConfig = <T, IServiceConfigEndPoints,IServiceConfigOptions>(config: {[P in keyof T]: IServiceConfig<IServiceConfigEndPoints, IServiceConfigOptions>}): void => {
    const serviceConfig = getServiceConfig();
    if(!serviceConfig.config) {
        serviceConfig.config = config;
    } else {
        StaticCommon.extend(serviceConfig.config, config);
    }
};

export const defineServiceNamespace = <IServiceEndPoints, IServiceConfigOptions>(nameSpace: string, configData: IServiceConfig<IServiceEndPoints, IServiceConfigOptions>): void => {
    const serviceConfigData = getServiceConfig();
    if(serviceConfigData) {
        const globalConfig = getGlobalConfiguration();
        if(!globalConfig.service.config) {
            StaticCommon.defineReadOnlyProperty(globalConfig.service, "config", {});
        }
        StaticCommon.setValue(serviceConfigData.config, nameSpace, configData);
    } else {
        throw new Error("Plase use setServiceConfig to define config node for service call");
    }
};

export const setServiceRequstConfig = <IServiceEndPointOptions>(namespaceKey: string, key: string, configData:IServiceEndPoint<IServiceEndPointOptions>): void => {
    const serviceState = getServiceConfig();
    if(serviceState) {
        const namespaceData:IServiceConfig<any, IServiceEndPointOptions> = StaticCommon.getValue(serviceState.config, namespaceKey);
        if(namespaceData) {
            if(!namespaceData.endPoints) {
                namespaceData.endPoints = <any>{};
            }
            StaticCommon.defineReadOnlyProperty(namespaceData.endPoints, key, configData);
        } else {
            throw new Error("Can not find that namespace: " + namespaceKey);
        }
    } else {
        throw new Error("Please use setServiceConfig to define service config state first.");
    }
};

export const setServiceNamespaceEndPoints = <T,IServiceConfigOptions>(namespaceKey: string, configData:T): void => {
    const serviceState = getServiceConfig();
    if(serviceState) {
        const namespaceData:IServiceConfig<any, IServiceConfigOptions> = StaticCommon.getValue(serviceState.config, namespaceKey);
        if(namespaceData) {
            if(!namespaceData.endPoints) {
                StaticCommon.defineReadOnlyProperty(namespaceData, "endPoints", configData);
            } else {
                StaticCommon.extend(namespaceData.endPoints, configData, true);
            }
        } else {
            throw new Error("Can not find that namespace: " + namespaceKey);
        }
    } else {
        throw new Error("Please use setServiceConfig to define service config state first.");
    }
};
