import { defineServiceNamespace, getServiceConfig,setServiceConfig,setServiceNamespaceEndPoints,setServiceRequstConfig } from "./AppServiceConfig";
import { getRouterConfig,getRouterServiceByNamespace,getRouterServiceConfig,setRouterServiceConfig } from "./RouterServiceConfig";

export * from "./GlobalConfig";
export * from "./TypeGlobalConfig";

/**
 * 应用程序API请求参数配置
 */
export const appServiceConfig = {
    defineServiceNamespace,
    getServiceConfig,
    setServiceConfig,
    setServiceNamespaceEndPoints,
    setServiceRequstConfig
};

export const routerServiceConfig = {
    getRouterConfig,
    getRouterServiceByNamespace,
    getRouterServiceConfig,
    setRouterServiceConfig
};
