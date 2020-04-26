import { AxiosResponse } from "axios";

export type TypeServiceRequestType = "POST" | "GET" | "DELETE" | "PUT";

export interface IServiceRequest<ServiceRequestOptions> {
    endPoint?: string;
    type?: TypeServiceRequestType;
    data?: any;
    timeout?: number;
    uri?: any;
    url?: string;
    skip?: boolean;
    header?: any;
    namespace?: string;
    options?: ServiceRequestOptions;
    id?: string;
    success?: Function;
    fail?: Function;
    complete?: Function;
    uploadProgress?(event:ProgressEvent, requestData?: IServiceRequest<ServiceRequestOptions>): void;
    downloadProgress?(event:ProgressEvent, requestData?: IServiceRequest<ServiceRequestOptions>): void;
}

export interface IServiceConfig<TypeServiceEndPoints, TypeServiceEndPointOptions> {
    baseUrl: string;
    dummy?: boolean;
    dummyPath?: string;
    endPoints: {[P in keyof TypeServiceEndPoints]: IServiceEndPoint<TypeServiceEndPointOptions>};
    envUrls?: {};
    proxy?: string;
}

export interface IServiceEndPoint<TypeOptions> {
    url: string;
    type?: TypeServiceRequestType;
    method?: TypeServiceRequestType;
    header?: any;
    uri?: any;
    payload?: any;
    dummy?: string;
    options?:TypeOptions;
    data?: any;
    onAfter?(resp:AxiosResponse): void;
    onBefore?<IServiceRequestOptions>(options?:IServiceRequest<IServiceRequestOptions>, endPoint?:IServiceEndPoint<TypeOptions>): void;
}
