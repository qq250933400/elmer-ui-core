import { queueCallFunc, utils, TypeQueueCallParam, Common } from "elmer-common";
import { ElmerWorker } from "elmer-worker";
import { Service } from "../decorators";
import { EventContext } from "./EventContext";
import { IEventContext, TypeDomEventOptions, TypeEventHandler } from "./IEventContext";

type TypeEventContextData<T={}> = {[P in keyof T]: EventContext};

@Service
export class ElmerEvent extends Common {
    private eventListeners: any = {};
    private worker: ElmerWorker;
    private eventData: TypeEventContextData = {};
    private eventHandlers: TypeEventHandler[] = [];
    private eventOriginHandler: any = {};
    constructor(worker: ElmerWorker) {
        super();
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
            const bindEventName = options.eventName;
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
            if (!this.eventData[bindEventName]) {
                const invokeEvent = (event: Event) => {
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
                };
                this.addEventListener(options.eventName, invokeEvent);
                this.eventData[bindEventName] = {};
                // 将初始事件处理方法保留，以便后面做删除操作
                this.eventOriginHandler[bindEventName] = invokeEvent;
            }
            if (!EUIEventsOption.events[bindEventName]) {
                EUIEventsOption.events[bindEventName] = eventId;
            } else {
                throw new Error(`The event of ${options.eventName} already has event handler.`);
            }
            if(options.eventName !== "resize") {
                (dom as any).EUIEventsOption = EUIEventsOption;
            }
            this.eventData[bindEventName][eventId] = options;
            this.eventHandlers.push({
                depth: options.depth,
                eventId,
                eventName: bindEventName,
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
    /**
     * 移除事件监听
     * @param virtualNodeId - (optional)自定义组件虚拟节点ID
     * @param eventId - (optional)要删除的事件ID列表
     */
    unsubscribe(virtualNodeId?: string, eventIds?: string[]): void {
        if(!utils.isEmpty(virtualNodeId) || eventIds?.length > 0) {
            const newEventHandler = [];
            // 将事件从事件索引列表删除
            for(let i=this.eventHandlers.length - 1;i>=0;i--) {
                const evt = this.eventHandlers[i];
                let isRemoved = false;
                if(evt?.virtualId === virtualNodeId) {
                    // 当前事件监听所在虚拟domID与移除事件监听dom相同
                    isRemoved = true;
                }
                if(!isRemoved) {
                    // 当前事件监听所在虚拟domID与移除事件监听dom不相同时
                    if(eventIds && eventIds.indexOf(evt.eventId) >= 0) {
                        // 事件ID和移除事件ID相同
                        isRemoved = true;
                    }
                }
                !isRemoved && newEventHandler.push(evt);
            }
            this.eventHandlers = newEventHandler;
            // 将事件监听从监听源数据删除
            Object.keys(this.eventData).map((eventName: string) => {
                const evtInfo = this.eventData[eventName];
                Object.keys(evtInfo).map((eventId) => {
                    let isDelete = false;
                    if(eventIds && eventIds.indexOf(eventId) >= 0) {
                        isDelete = true;
                        delete evtInfo[eventId];
                    }
                    if((!isDelete && evtInfo[eventId] as IEventContext).virtualId === virtualNodeId) {
                        delete evtInfo[eventId];
                    }
                });
                if(Object.keys(evtInfo).length <= 0) {
                    // 当所有事件监听都从虚拟节点移除以后，将根元素的事件监听移除
                    // 保证所有做过删除的事件不会被调用两次
                    this.removeEventListen(eventName, this.eventOriginHandler[eventName]);
                    delete this.eventData[eventName];
                    delete this.eventOriginHandler[eventName];
                }
            });
        }
    }
    /**
     * 当dom元素由于Delete操作导致后面的元素位置变化需要更新path到指定节点事件绑定对象上
     * @param events - 当前元素绑定的事件信息 Type TypeEvents<T={}> = {[P in keyof T]: String}
     * @param newPath - 当前元素最新的位置路径
     */
    updateEventPath(events: any, newPath: number[]): void {
        const updateEvents = [];
        Object.keys(events).map((eventName) => {
            updateEvents.push(events[eventName]);
        });
        for(let i=0;i<this.eventHandlers.length;i++) {
            const eventId = this.eventHandlers[i].eventId;
            if(updateEvents.indexOf(eventId)>=0) {
                this.eventHandlers[i].path = newPath;
            }
        }
        Object.keys(this.eventData).map((eventName) => {
            const eventData = this.eventData[eventName];
            Object.keys(eventData).map((eventId) => {
                if(updateEvents.indexOf(eventId)>=0) {
                    (eventData[eventId] as IEventContext).path = newPath;
                }
            });
        });
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
                            dataSet: null,
                            nativeEvent: event,
                            srcElement: (event as any).srcElement
                        };
                        /** 针对特殊事件做处理，在事件池保存name区分大小写 */
                        const type = /animationEnd$/i.test(event.type) ? "animationEnd" : (/transitionEnd$/i.test(event.type) ? "transitionEnd" : event.type);
                        const eventHandlers = this.eventData[type];
                        if(eventHandlers) {
                            for(const evt of matchEvents) {
                                const handler:IEventContext = eventHandlers[evt.eventId];
                                if(handler) {
                                    const callback = handler.callback;
                                    const eventTarget = handler.target;
                                    callEventOptions.currentTarget = eventTarget;
                                    callEventOptions.dataSet = handler.dataSet;
                                    callEventOptions.data = handler.data;
                                    if(/^input$/i.test(eventTarget.tagName)) {
                                        if(/^(radio|checkbox)$/i.test((eventTarget as any).type)) {
                                            callEventOptions.checked = (eventTarget as any).checked;
                                        } else {
                                            callEventOptions.value = (eventTarget as any).value;
                                        }
                                    } else if(/^(textarea|select)$/i.test(eventTarget.tagName)) {
                                        callEventOptions.value = (eventTarget as any).value;
                                    }
                                    if(/^mouse/i.test(type)) {
                                        // mouse event
                                        callEventOptions.x = (event as MouseEvent).x;
                                        callEventOptions.y = (event as MouseEvent).y;
                                    } else if(/^touch/i.test(type)) {
                                        callEventOptions.touches = (event as TouchEvent).touches;
                                    }
                                    typeof handler?.callback === "function" && callback(callEventOptions);
                                    // console.log(callback, evt.eventId);
                                    if(callEventOptions.cancelBubble) {
                                        break;
                                    }
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
