import { queueCallFunc, StaticCommon as utils, TypeQueueCallParam } from "elmer-common";
import { ElmerWorker } from "elmer-worker";

type TypeEventIdMapping = {
    eventId: string;
    path: number[];
};

export class ElmerEvent {
    eventListeners: any = {};

    private worker: ElmerWorker;
    private sortReady: boolean;
    constructor(worker: ElmerWorker) {
        this.worker = worker;
    }
    subscribe(eventName: string,path: string[]|number[], callback: Function): string {
        const evtId = "evt_" + utils.guid();
        if(!this.eventListeners[eventName]) {
            const eventCallback = (() => {
                return async(evt:Event) => {
                    const tPath:any[] = (evt.target as any).path;
                    const evtName = evt.type;
                    const eventData = this.eventListeners[evtName];
                    if(eventData) { 
                        console.log(evtName, tPath, eventData);
                        // 使用worker排序，将最深元素排前面，从最深节点开始检测事件
                        // 当path长度小于或等于当前触发事件的path, 则认为监听的事件节点所处层级最高层
                        // 去监听事件的path与最初触发事件节点的path对比，当监听事件path和触发节点的path前部分相等
                        this.worker.callObjMethod("elmerEvent", "sortEventId", eventData.mapEventId).then((resp:any) => {
                            if(/^200$/.test(resp.statusCode)) {
                                const evtIds: TypeEventIdMapping[] = resp.data || [];
                                const evtParams: TypeQueueCallParam[] = [];
                                for(const evtId of evtIds) {
                                    const bubbleEvent = {
                                        cancelBubble: false,
                                        nativeEvent: evt
                                    };
                                    if(evtId.path.length <= tPath.length) {
                                        const forEvtIDS = evtId.path.join(",");
                                        const compareIDS = tPath.slice(0, evtId.path.length).join(",");
                                        if(forEvtIDS === compareIDS) {
                                            const evtCallback = eventData.eventListener[evtId.eventId];
                                            evtParams.push({
                                                id: "evt_" + eventName + "_" + evtParams.length,
                                                params: {
                                                    event: bubbleEvent,
                                                    callback: evtCallback
                                                }
                                            })
                                        }
                                    }
                                }
                                queueCallFunc(evtParams, (option, myParam:any):any => {
                                    return myParam.callback(myParam.event, option.lastResult);
                                });
                            } else {
                                throw new Error(resp.message);
                            }
                        }).catch((err) => {
                            console.error(err);
                        });
                    }
                };
            })();
            this.eventListeners[eventName] = {
                eventHandler: eventCallback,
                eventListener: {},
                mapEventId: []
            };
            this.addEvent(document.body,eventName, eventCallback);
        }
        this.eventListeners[eventName]["eventListener"][evtId] = callback;
        this.eventListeners[eventName].mapEventId.push({
            eventId: evtId,
            path
        });
        return evtId;
    }
    unsubscribe(eventName: string, eventId: string): void {
        // remove event listen
        if(this.eventListeners[eventName]) {
            delete this.eventListeners[eventName][eventId]; // 将事件监听回调函数从观察者列表移除
            if(Object.keys(this.eventListeners[eventName]).length <= 0) {
                // 当某个事件下没有监听回调函数时将从顶层级dom的事件监听移除
                // 为了兼容resize事件，当时resize事件时事件监听的节点修改为window
                this.removeEvent(document.body, eventName, this.eventListeners[eventName].eventHandler);
                delete this.eventListeners[eventName];
            }
        }
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
