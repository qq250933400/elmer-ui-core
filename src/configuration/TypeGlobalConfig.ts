import { AxiosResponse } from "axios";
import { IServiceConfig, IServiceEndPoint, IServiceRequest } from "../interface/IElmerService";

export type TypeI18nDefaultLocale = "zhGN" | "enGB";
export type TypeServiceEnv = "LOCAL" | "UAT" | "SIT" | "PROD";

export type TypeI18nConfig<I18nData, SupportLocales, Conversions> = {
    locale?: (keyof I18nData) | SupportLocales;
    converts?: Conversions;
    data: I18nData;
};

export type TypeServiceError = {
    statusCode: string | number;
    message: string;
    resp: any;
};
export type TypeRouterServiceEndPointOptions = {
    path: string;
    reduxActionType?: string;
};
export type TypeRouterConfig<TypeRouterConfigData, RouterServiceConfigEndPointOptions> = {
    service: TypeServiceConfig<TypeRouterConfigData, RouterServiceConfigEndPointOptions & TypeRouterServiceEndPointOptions>
};
export type TypeServiceEvent = {
    status?: string | number;
    statusText?: string | number;
    canceled?: boolean;
    data?:any;
};
export type TypeServiceConfig<TypeServiceConfigData, TypeServiceConfigEndPointOptions> = {
    common?: {
        onResponse?(resp:AxiosResponse, event?: TypeServiceEvent): boolean | undefined;
        onBefore?(endPoint:IServiceEndPoint<TypeServiceConfigEndPointOptions>): boolean | undefined;
        onError?(error: TypeServiceError): boolean | undefined;
    },
    config: { [P in keyof TypeServiceConfigData]: IServiceConfig<any, TypeServiceConfigEndPointOptions> };
};

export type TypeGlobalConfig<AppServiceNamespaceConfig,AppServiceConfigEndPointOptions,RouterServiceConfig,RouterServiceConfigEndPointOptions, I18nData,I18nLocales, I18nConvert, ENV> = {
    router?: TypeRouterConfig<RouterServiceConfig, RouterServiceConfigEndPointOptions>;
    service?: TypeServiceConfig<AppServiceNamespaceConfig, AppServiceConfigEndPointOptions>;
    i18n?: TypeI18nConfig<I18nData, I18nLocales, I18nConvert>;
    env?: TypeServiceEnv & ENV;
};
