import { queueCallFunc, StaticCommon as utils, TypeQueueCallParam } from "elmer-common";
import { ElmerWorker } from "elmer-worker";

type TypeEventIdMapping = {
    eventId: string;
    path: number[];
};
type TypeSubscribeEvent = {
    callback: Function;
    eventName: string;
    vNodePath: string;
    path: number[];
};

export class ElmerEvent {
    eventListeners: any = {};

    private worker: ElmerWorker;
    private sortReady: boolean;
    private nodeMap: any = {};
    constructor(worker: ElmerWorker) {
        this.worker = worker;
    }
    /**
     * mount node to the event object
     * @param path node path
     */
    nodeRegister(path:string): void {
        const pathReg = /\.([a-z0-9\-\_]{1,})$/i;
        const pMatch = path.match(pathReg);
        const parentPath = pMatch ? path.replace(pathReg, "") : null;
        const currentPath = pMatch ? pMatch[1] : path;
        if(!utils.isEmpty(parentPath)) {
            const parentPathKey = parentPath.replace(/\./g, ".nodes.");
            const pNode:any = utils.getValue(this.nodeMap, parentPathKey);
            pNode.nodes[currentPath] = {
                events: [],
                nodes: {},
                parent: "",
            };
        } else {
            this.nodeMap[currentPath] = {
                events: [],
                nodes: {},
                parent: "",
            };
        }
    }
    /**
     * 注册事件监听
     * @param options 注册事件监听参数
     */
    subscribe(options: TypeSubscribeEvent): string {
        const { path, eventName, callback, vNodePath } = options;
        const evtId = "evt_" + utils.guid();
        const pathStr = path.join(",");
        const eventPathList:string[] = this.eventListeners[eventName] ? this.eventListeners[eventName]["eventPaths"] : [];
        if(eventPathList.indexOf(pathStr) < 0) {
            if(!this.eventListeners[eventName]) {
                const eventCallback = (() => {
                    return async(evt:Event) => {
                        const tPath:any[] = (evt.target as any).path;
                        const evtName = evt.type;
                        const eventData = this.eventListeners[evtName];
                        if((eventData && tPath) || evtName === "resize") {
                            // 使用worker排序，将最深元素排前面，从最深节点开始检测事件
                            // 当path长度小于或等于当前触发事件的path, 则认为监听的事件节点所处层级最高层
                            // 去监听事件的path与最初触发事件节点的path对比，当监听事件path和触发节点的path前部分相等
                            this.worker.callObjMethod("elmerEvent", "sortEventId", eventData.mapEventId).then((resp:any) => {
                                if(/^200$/.test(resp.statusCode)) {
                                    const width = window.innerWidth, height = window.innerHeight, outWidth = window.outerWidth, outHeight = window.outerHeight;
                                    const evtIds: TypeEventIdMapping[] = resp.data || [];
                                    const evtParams: TypeQueueCallParam[] = [];
                                    for(const evtMap of evtIds) {
                                        const bubbleEvent = {
                                            cancelBubble: false,
                                            nativeEvent: evt,
                                            width,
                                            // tslint:disable-next-line: object-literal-sort-keys
                                            height,
                                            outWidth,
                                            outHeight
                                        };
                                        if(evtName !== "resize") {
                                            if(evtMap.path && evtMap.path.length <= tPath.length) {
                                                const forEvtIDS = evtMap.path.join(",");
                                                const compareIDS = tPath.slice(0, evtMap.path.length).join(",");
                                                if(forEvtIDS === compareIDS) {
                                                    const evtCallback = eventData.eventListener[evtMap.eventId];
                                                    evtParams.push({
                                                        id: "evt_" + eventName + "_" + evtParams.length,
                                                        params: {
                                                            callback: evtCallback,
                                                            event: bubbleEvent
                                                        }
                                                    });
                                                }
                                            }
                                        } else {
                                            const evtCallback = eventData.eventListener[evtMap.eventId];
                                            evtParams.push({
                                                id: "evt_" + eventName + "_" + evtParams.length,
                                                params: {
                                                    callback: evtCallback,
                                                    event: bubbleEvent
                                                }
                                            });
                                        }
                                    }
                                    queueCallFunc(evtParams, (option, myParam:any):any => {
                                        return myParam.callback(myParam.event, option.lastResult);
                                    });
                                } else {
                                    throw new Error(resp.message);
                                }
                            }).catch((err) => {
                                // tslint:disable-next-line: no-console
                                console.error(err);
                            });
                        }
                    };
                })();
                this.eventListeners[eventName] = {
                    eventHandler: eventCallback,
                    eventListener: {},
                    eventPaths: [],
                    mapEventId: []
                };
            }
            this.eventListeners[eventName]["eventListener"][evtId] = callback;
            this.eventListeners[eventName].mapEventId.push({
                eventId: evtId,
                path
            });
            this.eventListeners[eventName].eventPaths.push(pathStr);
            return evtId;
        }
    }
    unsubscribe(eventName: string, eventId: string): void {
        // remove event listen
        if(this.eventListeners[eventName]) {
            delete this.eventListeners[eventName][eventId]; // 将事件监听回调函数从观察者列表移除
            if(Object.keys(this.eventListeners[eventName]).length <= 0) {
                // 当某个事件下没有监听回调函数时将从顶层级dom的事件监听移除
                // 为了兼容resize事件，当时resize事件时事件监听的节点修改为window
                const eventCallback = this.eventListeners[eventName].eventHandler;
                this.removeEventListen(eventName, eventCallback);
                delete this.eventListeners[eventName];
            }
        }
    }
    unsubscribeByPath(path: number[]): void {
        Object.keys(this.eventListeners).map((eventName:string) => {
            const eventData = this.eventListeners[eventName];
            const mapEventIds: TypeEventIdMapping[] = eventData.mapEventId;
            const newMapEventId = [];
            const eventPaths:string[] = eventData.eventPaths || [];
            // const newEventPaths = [];
            let hasRemoved = false;
            for(const mapEvtId of mapEventIds) {
                if(mapEvtId.path.length >= path.length) {
                    // 移除dom元素事件监听应该移除当前元素的子元素事件
                    if(mapEvtId.path.slice(0,path.length).join(",") === path.join(",")) {
                        const pathStr = mapEvtId.path.join(",");
                        const pathIndex = eventPaths.indexOf(pathStr);
                        pathIndex >=0 && eventPaths.splice(pathIndex ,1);
                        // path suffix match
                        delete eventData.eventListener[mapEvtId.eventId];
                        hasRemoved = true;
                    } else {
                        newMapEventId.push(mapEvtId);
                    }
                } else {
                    newMapEventId.push(mapEvtId);
                }
            }
            if(hasRemoved) {
                if(newMapEventId.length === 0 && Object.keys(eventData.eventListener).length === 0) {
                    this.removeEventListen(eventName, eventData.eventHandler);
                    delete this.eventListeners[eventName];
                } else {
                    // 重置所有的id数组
                    this.eventListeners[eventName].mapEventId = newMapEventId;
                    this.eventListeners[eventName].eventPaths = eventPaths;
                }
            }
        });
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
