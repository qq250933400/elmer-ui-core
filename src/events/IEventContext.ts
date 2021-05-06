export interface IEventContext {
    readonly callback?: Function;
    readonly depth: number;
    readonly data?: any;
    readonly dataSet?: any;
    readonly eventId?: string;
    readonly eventName: string;
    readonly eventHandler: Function;
    readonly virtualId: string;
    readonly virtualPath: string;
    readonly virtualNodePath: number[];
    readonly target?:HTMLElement;
    path: number[];
}

export type TypeDomEventOptions = {
    depth: number;
    path: number[];
    events: any;
};

export type TypeEventHandler = {[P in Exclude<keyof IEventContext, "eventHandler"|"dataSet"|"data"|"callback">]?: IEventContext[P]};
