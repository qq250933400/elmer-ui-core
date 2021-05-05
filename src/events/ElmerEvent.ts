import { queueCallFunc, StaticCommon as utils, TypeQueueCallParam } from "elmer-common";
import { ElmerWorker } from "elmer-worker";
import { EventContext } from "./EventContext";
import { IEventContext, TypeDomEventOptions } from "./IEventContext";

type TypeEventIdMapping = {
    eventId: string;
    path: number[];
};
type TypeEventData = {
    eventPathId: string[];
    handler: Function;
    listeners: any;
    paths: TypeEventIdMapping[];
};

type TypeSubscribeEvent = {
    callback: Function;
    eventName: string;
    vNodePath: string;
    path: number[];
};
type TypeEventMapData = {
    events: any;
    nodes: any;
    parent: string;
    path: number[];
};
type TypeEventContextData<T={}> = {[P in keyof T]: EventContext};

export class ElmerEvent {
    private eventListeners: any = {};
    private worker: ElmerWorker;
    private eventData: TypeEventContextData = {};
    private eventHandlers: any = [];
    constructor(worker: ElmerWorker) {
        this.worker = worker;
    }
    dispose(): void {
        Object.keys(this.eventListeners).map((eventName: string): void => {
            const evtObj = this.eventListeners[eventName];
            Object.keys(evtObj).map((evtId: string) => {
                this.removeEvent(document.body, eventName, evtObj[evtId].callback);
            });
            delete this.eventListeners[eventName];
        });
        this.eventListeners = {};
    }
    subscribe(dom:HTMLElement,options: IEventContext): String {
        const eventId = "Event_" + utils.guid().replace(/\-/g, "") + "_" + (new Date()).getTime();
        try {
            // const ect = new EventContext(options);
            let EUIEventsOption: TypeDomEventOptions = options.eventName !== "resize" ? (dom as any).EUIEventsOption : null; 
            EUIEventsOption = (EUIEventsOption || {
                depth: options.depth,
                eventId,
                events: {},
                path: options.path,
                virtualId: options.virtualId,
                virtualNodePath: options.virtualNodePath,
                virtualPath: options.virtualPath
            }) as any;
            if (!this.eventData[options.eventName]) {
                this.addEventListener(options.eventName, (event: Event) => {
                    const eventPath = <HTMLElement[]>(event as any).path;
                    if (event.type !== "resize" && eventPath && eventPath.length > 0) {
                        let srcEventDom: HTMLElement;
                        let eventOptions: TypeDomEventOptions;
                        for (let i = 0; i < eventPath.length; i++) {
                            const myOptions: TypeDomEventOptions = (eventPath[i] as any).EUIEventsOption;
                            if (myOptions) {
                                eventOptions = myOptions;
                                srcEventDom = eventPath[i];
                                break;
                            }
                        }
                        if (srcEventDom) {
                            // find the event target that event handler was bind by ElmerEvent
                            this.callEventHandler(eventOptions, event);
                        }
                    } else {
                        this.callResizeEventHandler(event);
                    }
                });
                this.eventData[options.eventName] = {};
            }
            if (!EUIEventsOption.events[options.eventName]) {
                EUIEventsOption.events[options.eventName] = eventId;
            } else {
                throw new Error(`The event of ${options.eventName} already has event handler.`);
            }
            if(options.eventName !== "resize") {
                (dom as any).EUIEventsOption = EUIEventsOption;
            }
            this.eventData[options.eventName][eventId] = options;
            this.eventHandlers.push({
                depth: options.depth,
                eventId,
                eventName: options.eventName,
                path: options.path,
                virtualId: options.virtualId,
                virtualNodePath: options.virtualNodePath,
                virtualPath: options.virtualPath
            });
        } catch (e) {
            // tslint:disable-next-line: no-console
            console.error(e);
        }
        return eventId;
    }
    private callResizeEventHandler(event:Event): void {
        this.worker.callObjMethod("elmerEvent", "resizeEventSortAction", this.eventHandlers)
            .then((resp) => {
                if(/^200$/.test(resp.statusCode)) {
                    const matchEvents: IEventContext[] = resp.data || [];
                    const eventHandlers = this.eventData["resize"];
                    if(eventHandlers) {
                        const callEventOptions:any = {
                            cancelBubble: false,
                            height: window.innerHeight,
                            nativeEvent: event,
                            width: window.innerWidth
                        };
                        for(const evt of matchEvents) {
                            const handler:IEventContext = eventHandlers[evt.eventId];
                            const callback = handler.callback;
                            typeof handler?.callback === "function" && callback(callEventOptions);
                        }
                    }
                }
            }).catch((err) => {
                // tslint:disable-next-line: no-console
                console.error(err);
            });
    }
    /**
     * 响应事件，查找到在事件触发返回的callback并触发，如果遇到cancelBubble将停止事件冒泡
     * @param eventOptions - 保存到dom节点上的数据
     * @param event - Native Event
     */
    private callEventHandler(eventOptions: TypeDomEventOptions, event:Event): void {
        this.worker.callObjMethod("elmerEvent", "eventHandleSort", event.type, eventOptions, this.eventHandlers)
            .then((resp) => {
                if(/^200$/.test(resp.statusCode)) {
                    const matchEvents: IEventContext[] = resp.data || [];
                    if(matchEvents.length > 0) {
                        const callEventOptions:any = {
                            cancelBubble: false,
                            nativeEvent: event
                        };
                        const type = event.type;
                        const eventHandlers = this.eventData[type];
                        if(eventHandlers) {
                            for(const evt of matchEvents) {
                                const handler:IEventContext = eventHandlers[evt.eventId];
                                const callback = handler.callback;
                                typeof handler?.callback === "function" && callback(callEventOptions);
                                // console.log(callback, evt.eventId);
                                if(callEventOptions.cancelBubble) {
                                    break;
                                }
                            }
                        }
                    }
                }
            }).catch((error) => {
                // tslint:disable-next-line: no-console
                console.error(error);
            });
    }
    private addEventListener(eventName: string, eventCallback: Function): void {
        if(eventName !== "resize") {
            this.addEvent(document.body,eventName, eventCallback);
            if(eventName === "animationEnd") {
                this.addEvent(document.body,"webkitAnimationEnd", eventCallback);
                this.addEvent(document.body,"mozAnimationEnd", eventCallback);
                this.addEvent(document.body,"msAnimationEnd", eventCallback);
                this.addEvent(document.body,"oAnimationEnd", eventCallback);
            } else if(eventName === "transitionEnd") {
                this.addEvent(document.body,"webkitTransitionEnd", eventCallback);
                this.addEvent(document.body,"mozTransitionEnd", eventCallback);
                this.addEvent(document.body,"msTransitionEnd", eventCallback);
                this.addEvent(document.body,"oTransitionEnd", eventCallback);
            }
        } else {
            this.addEvent(window,eventName, eventCallback);
        }
    }
    private removeEventListen(eventName: string, callback:Function): void {
        if(eventName !== "resize") {
            this.removeEvent(document.body, eventName, callback);
            if(eventName === "animationEnd") {
                this.removeEvent(document.body,"webkitAnimationEnd", callback);
                this.removeEvent(document.body,"mozAnimationEnd", callback);
                this.removeEvent(document.body,"msAnimationEnd", callback);
                this.removeEvent(document.body,"oAnimationEnd", callback);
            } else if(eventName === "transitionEnd") {
                this.removeEvent(document.body,"webkitTransitionEnd", callback);
                this.removeEvent(document.body,"mozTransitionEnd", callback);
                this.removeEvent(document.body,"msTransitionEnd", callback);
                this.removeEvent(document.body,"oTransitionEnd", callback);
            }
        } else {
            this.removeEvent(window, "resize", callback);
        }
    }
    private addEvent(dom:HTMLElement|Window, eventName: string, callback:Function): void {
        if(dom.addEventListener) {
            dom.addEventListener(eventName, callback as any, {
                passive: true
            });
        } else if((dom as any).attachEvent) {
            (dom as any).attachEvent("on" + eventName, callback);
        }
    }
    private removeEvent(dom:HTMLElement|Window, eventName: string, callback:Function): void {
        if(dom.removeEventListener) {
            dom.removeEventListener(eventName, callback as any);
        } else if((dom as any).detachEvent) {
            (dom as any).detachEvent("on" + eventName, callback);
        }
    }
}
