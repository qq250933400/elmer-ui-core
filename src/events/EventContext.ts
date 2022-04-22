import { IEventContext } from "./IEventContext";

export class EventContext implements IEventContext {
    depth: number;
    eventName: string;
    eventHandler: Function;
    path: number[];
    virtualId: string;
    virtualNodePath: number[];
    virtualPath: string;
    constructor(options: IEventContext) {
        this.depth = options.depth;
        this.eventHandler = options.eventHandler;
        this.eventName = options.eventName;
        this.path = options.path;
        this.virtualId = options.virtualId;
        this.virtualPath = options.virtualPath;
        this.virtualNodePath = options.virtualNodePath;
    }
}
