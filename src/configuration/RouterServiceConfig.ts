import { StaticCommon } from "elmer-common";
import { IServiceConfig } from "../interface/IElmerService";
import { getGlobalConfiguration } from "./GlobalConfig";
import { TypeRouterConfig, TypeServiceConfig } from "./TypeGlobalConfig";

export const getRouterConfig = <RouterConfigData, RouterConfigOptions>():TypeRouterConfig<RouterConfigData, RouterConfigOptions> => {
    const globalConfig = getGlobalConfiguration<unknown,unknown,RouterConfigData,RouterConfigOptions, unknown, unknown, unknown>();
    return globalConfig.router;
};

export const getRouterServiceConfig = <RouterConfigData, RouterConfigOptions>():IServiceConfig<any, RouterConfigOptions> => {
    const routerService = getRouterConfig<RouterConfigData, RouterConfigOptions>();
    return <any>routerService.service.config;
};

export const getRouterServiceByNamespace = <IServiceEndPoints,IServiceConfigOptions>(namespace:string):IServiceConfig<IServiceEndPoints, IServiceConfigOptions> => {
    const serviceConfig = getRouterServiceConfig<unknown, unknown>();
    return serviceConfig[namespace];
};

export const setRouterServiceConfig = <ConfigData, ConfigDataOptions>(configData:TypeServiceConfig<ConfigData, ConfigDataOptions>): void => {
    const globalConfig = getGlobalConfiguration<unknown,unknown,ConfigData, ConfigDataOptions, unknown, unknown, unknown>();
    if(globalConfig.router && globalConfig.router.service) {
        StaticCommon.extend(globalConfig.router.service, configData);
    } else  {
        globalConfig.router = <any>{
            requests: {}
        };
        globalConfig.router.service = configData;
    }
};
