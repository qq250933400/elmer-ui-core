
import { StaticCommon } from "elmer-common";
import { defineGlobalState, getGlobalState } from "../init/globalUtil";
import { TypeGlobalConfig, TypeI18nDefaultLocale } from "./TypeGlobalConfig";

export const defineGlobalConfiguration = <
    AppServiceNamespaceConfig,
    AppServiceConfigEndPointOptions,
    RouterServiceConfig,
    RouterServiceConfigEndPointOptions,
    I18nData,I18nLocales,
    I18nConvert,ENV>(
        configData: TypeGlobalConfig<
            AppServiceNamespaceConfig,
            AppServiceConfigEndPointOptions,
            RouterServiceConfig,
            RouterServiceConfigEndPointOptions,
            I18nData,
            I18nLocales,
            I18nConvert,
            ENV>
    ): void => {
    const saveConfigData:TypeGlobalConfig<
        AppServiceNamespaceConfig,
        AppServiceConfigEndPointOptions,
        RouterServiceConfig,
        RouterServiceConfigEndPointOptions,
        I18nData,
        I18nLocales,
        I18nConvert,
        ENV> = getGlobalState("configuration");
    if(!saveConfigData) {
        defineGlobalState("configuration", configData, false);
    } else {
        if(saveConfigData.service) {
            if(!saveConfigData.service.config) {
                StaticCommon.defineReadOnlyProperty(saveConfigData.service, "config", configData.service.config);
            } else {
                for(const key in configData.service.config) {
                    if(saveConfigData.service.config[key]) {
                        if(!saveConfigData.service.config[key].endPoints) {
                            saveConfigData.service.config[key].endPoints = <any>{};
                        } else {
                            StaticCommon.extend(saveConfigData.service.config[key], configData.service.config[key], true, ["endPoints"]);
                            StaticCommon.extend(saveConfigData.service.config[key].endPoints, configData.service.config[key].endPoints);
                        }
                    } else {
                        saveConfigData.service.config[key] = configData.service.config[key];
                    }
                }
            }
            if(saveConfigData.service.common) {
                StaticCommon.extend(saveConfigData.service.common, configData.service.common);
            } else {
                StaticCommon.setValue(saveConfigData.service, "common", configData.service.common);
            }
        } else {
            saveConfigData.service = configData.service;
        }
        if(saveConfigData.router) {
            if(!saveConfigData.router.service || !saveConfigData.router.service.config) {
                StaticCommon.setValue(saveConfigData.router, "service.config", configData.router.service.config);
            } else {
                // 如果已经通过其他方式注册配置request.service.config下的namespace信息，使用extend 方法，保留原有的数据
                for(const key in configData.router.service.config) {
                    if(saveConfigData.router.service.config) {
                        if(saveConfigData.router.service.config[key]) {
                            if(!saveConfigData.router.service.config[key].endPoints) {
                                saveConfigData.router.service.config[key].endPoints = <any>{};
                            } else {
                                StaticCommon.extend(saveConfigData.router.service.config[key], configData.router.service.config[key], true, ["endPoints"]);
                                StaticCommon.extend(saveConfigData.router.service.config[key].endPoints, configData.router.service.config[key].endPoints);
                            }
                        } else {
                            saveConfigData.router.service.config[key] = configData.router.service.config[key];
                        }
                    } else {
                        saveConfigData.router.service.config = configData.router.service.config;
                    }
                }
            }
            if(saveConfigData.router.service.common) {
                StaticCommon.extend(saveConfigData.router.service.common, configData.router.service.common);
            } else {
                StaticCommon.setValue(saveConfigData.router.service, "common", configData.router.service.common);
            }
        } else {
            saveConfigData.router = configData.router;
        }
        if(!StaticCommon.isEmpty(configData.env)) {
            saveConfigData.env = configData.env;
        }
        StaticCommon.extend(saveConfigData.i18n, configData.i18n, true);
    }
};

export const getGlobalConfiguration = <
    AppServiceNamespaceConfig,
    AppServiceConfigEndPointOptions,
    RouterServiceConfig,
    RouterServiceConfigEndPointOptions,
    I18nData,I18nLocales,
    I18nConvert,ENV>
    ():TypeGlobalConfig<
        AppServiceNamespaceConfig,
        AppServiceConfigEndPointOptions,
        RouterServiceConfig,
        RouterServiceConfigEndPointOptions,
        I18nData,
        I18nLocales,
        I18nConvert,
        ENV> => {
    let globalConfigState = getGlobalState("configuration");
    if(!globalConfigState) {
        globalConfigState = {
            i18n: {},
            router: {},
            service: {},
        };
        defineGlobalState("configuration", globalConfigState);
    }
    return globalConfigState;
};

export const getEnvFromCommand = (commandList:string[]): string => {
    let env = "Prod";
    if(commandList && commandList.length>0) {
        for(let i=0;i<commandList.length;i++) {
            const tmpCommand = commandList[i];
            const tmpMatch = tmpCommand.match(/^\-\-env\=([a-z0-9]{1,})$/i);
            if(tmpMatch) {
                env = tmpMatch[1];
            } else {
                const lMatch = tmpCommand.match(/^\-env\=([a-z0-9]{1,})$/i);
                if(lMatch) {
                    env = lMatch[1];
                }
            }
        }
    }
    return env;
};

export const setServiceEnv = (env:string): void => {
    if(!StaticCommon.isEmpty(env)) {
        const configData = getGlobalConfiguration();
        configData.env = <any>env;
    } else {
        // tslint:disable-next-line: no-console
        console.error("Service env can not be an empty string");
    }
};
