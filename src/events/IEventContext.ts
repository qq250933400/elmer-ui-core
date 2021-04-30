export interface IEventContext {
    readonly depth: number;
    readonly eventName: string;
    readonly eventHandler: Function;
    readonly path: number[];
    readonly virtualId: string;
    readonly virtualPath: string;
    readonly virtualNodePath: number[];
}

export type TypeDomEventOptions = {
    depth: number;
    path: number[];
    events: any;
};
