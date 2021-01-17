import { queueCallFunc, StaticCommon as utils, TypeQueueCallParam } from "elmer-common";
import { ElmerWorker } from "elmer-worker";

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

export class ElmerEvent {
    private eventListeners: any = {};
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
    nodeRegister(nodePath:string, path: number[]): void {
        const pathReg = /\.([a-z0-9\-\_]{1,})$/i;
        const pMatch = nodePath.match(pathReg);
        const parentPath = pMatch ? nodePath.replace(pathReg, "") : null;
        const currentPath = pMatch ? pMatch[1] : nodePath;
        if(!utils.isEmpty(parentPath)) {
            const parentPathKey = parentPath.replace(/\./g, ".nodes.");
            const pNode:any = utils.getValue(this.nodeMap, parentPathKey);
            pNode.nodes[currentPath] = {
                events: {},
                nodes: {},
                parent: "",
                path
            };
        } else {
            this.nodeMap[currentPath] = {
                events: {},
                nodes: {},
                parent: "",
                path
            };
        }
    }
    /**
     * 渲染之前调用此方法清除旧的事件监听，渲染的时候将新事件监听重新绑定
     * 删除节点的时候通过回调从最底层节点开始删除
     * @param path nodePath
     * @param deleteNodeMap 是否删除虚拟节点
     */
    nodeUnRegister(path: string, deleteNodeMap?: boolean): void {
        const eventNodePath = path.replace(/\./g, ".nodes.");
        const parentNode = eventNodePath.replace(/\.[a-z0-9\-\_]{1,}$/i,"");
        const nodePath = eventNodePath.match(/\.([a-z0-9\-\_]{1,})$/i);
        const nodeObj:TypeEventMapData = utils.getValue(this.nodeMap, parentNode);
        if(nodeObj) {
            if(nodeObj.events) {
                Object.keys(nodeObj.events).map((evtName) => {
                    const handleData = this.eventListeners[evtName];
                    const eventData:TypeEventData = nodeObj.events[evtName];
                    if(handleData && eventData.paths) {
                        const events = handleData.events;
                        for(const evtData of eventData.paths) {
                            delete events[evtData.eventId];
                        }
                        if(Object.keys(events).length <= 0) {
                            this.removeEventListen(evtName, handleData.handler);
                        }
                        eventData.listeners = {};
                        eventData.eventPathId = [];
                        eventData.paths = [];
                    }
                });
            }
            if(parentNode !== path) {
                deleteNodeMap && nodePath && delete nodeObj[nodePath[1]];
            } else {
                if(deleteNodeMap) {
                    this.nodeMap[path] = {
                        events: {},
                        nodes: {},
                        parent: "",
                    };
                }
            }
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
        const eventNodePath = vNodePath.replace(/\./g, ".nodes.");
        let eventNode = utils.getValue<TypeEventMapData>(this.nodeMap, eventNodePath);
        if(!utils.isEmpty(eventName)) {
            if(!eventNode) {
                this.nodeRegister(vNodePath, path);
                eventNode = utils.getValue<TypeEventMapData>(this.nodeMap, eventNodePath);
            }
            // console.log(eventNode, vNodePath);return;
            let evtObj:TypeEventData = eventNode.events[eventName];
            if(!evtObj) {
                const eventHandler = this.createEventHandler();
                eventNode.events[eventName] = {
                    eventPathId: [],
                    listeners: {},
                    paths: []
                };
                evtObj = eventNode.events[eventName];
                if(!this.eventListeners[eventName]) {
                    this.eventListeners[eventName] = {
                        events: {},
                        handler: eventHandler
                    };
                    this.addEventListener(eventName, eventHandler);
                }
            }
            if(evtObj.eventPathId.indexOf(pathStr)<0) {
                // 当前path不存在事件监听列表中才能加入列表
                evtObj.eventPathId.push(pathStr);
                evtObj.listeners[evtId] = callback;
                evtObj.paths.push({
                    eventId: evtId,
                    path
                });
                this.eventListeners[eventName].events[evtId] = {
                    nodePath: vNodePath
                };
            }
        }
        return evtId;
    }
    unsubscribe(eventName: string, eventId: string): void {
        // remove event listen
        if(this.eventListeners[eventName]) {
            const eventData = this.eventListeners[eventName];
            const events = eventData.events;
            const eventHandleData = events[eventId];
            if(eventHandleData) {
                const vNodePath = eventHandleData.nodePath;
                const eventNodePath = vNodePath.replace(/\./g, ".nodes.");
                const eventNodeMap = utils.getValue<TypeEventMapData>(this.nodeMap, eventNodePath);
                if(eventNodeMap) {
                    const eventNodeData: TypeEventData = eventNodeMap.events[eventName];
                    const newPath: string[] = [];
                    const newPathData: any[] = [];
                    for(let i=0;i<eventNodeData.paths.length;i++) {
                        if(eventNodeData.paths[i].eventId !== eventId) {
                            newPath.push(eventNodeData.paths[i].path.join(","));
                            newPathData.push(eventNodeData.paths[i]);
                        }
                    }
                    eventNodeData.eventPathId = newPath;
                    eventNodeData.paths = newPathData;
                }
                delete eventData.events[eventId];
                if(Object.keys(eventData.events).length <= 0) {
                    this.removeEventListen(eventName, eventData.handler);
                }
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
    private callEventAction(evt:Event, eventName:string, path: number[], vNodePath: string):void {
        const eventNodePath = vNodePath.replace(/\./g, ".nodes.");
        const eventNode = utils.getValue<TypeEventMapData>(this.nodeMap, eventNodePath);
        if(eventNode && eventNode.events) {
            let eventData:TypeEventData = null;
            // tslint:disable-next-line: forin
            for(const evtName in eventNode.events) {
                if(evtName === eventName) {
                    eventData = eventNode.events[evtName];
                    break;
                }
            }
            // 当前节点没有事件handler,往上一级执行，一直到最上层元素，或则有事件触发cancelBubble事件属性
            if(!eventData) {
                const parentNode = vNodePath.replace(/\.[a-z0-9\-\_]{1,}$/i,"");
                !utils.isEmpty(parentNode) && parentNode !== vNodePath && this.callEventAction(evt, eventName, eventNode.path, parentNode);
            } else {
                this.worker.callObjMethod("elmerEvent", "sortEventId", eventData.paths, path).then((resp:any) => {
                    if(/^200$/.test(resp.statusCode)) {
                        const respData = resp.data || {};
                        const evtIds:TypeEventIdMapping[] = respData.allPathData || [];
                        const width = window.innerWidth, height = window.innerHeight, outWidth = window.outerWidth, outHeight = window.outerHeight;
                        const evtParams: TypeQueueCallParam[] = [];
                        const curPath:number[] = respData.path;
                        let isCancelBubble = false;
                        for(const evtMap of evtIds) {
                            const bubbleEvent = {
                                cancelBubble: false,
                                nativeEvent: evt,
                                windowRect: {
                                    height,
                                    outHeight,
                                    outWidth,
                                    width,
                                }
                            };
                            if(eventName !== "resize") {
                                if(evtMap.path && evtMap.path.length <= curPath.length) {
                                    const forEvtIDS = evtMap.path.join(",");
                                    const compareIDS = curPath.slice(0, evtMap.path.length).join(",");
                                    if(forEvtIDS === compareIDS) {
                                        const evtCallback = eventData.listeners[evtMap.eventId];
                                        evtCallback(bubbleEvent, evtParams);
                                        if(bubbleEvent.cancelBubble) {
                                            isCancelBubble = true;
                                            break;
                                        }
                                    }
                                }
                            } else {
                                const evtCallback = eventData.listeners[evtMap.eventId];
                                evtCallback(bubbleEvent, evtParams);
                            }
                        }
                        if(!isCancelBubble) {
                            const parentNode = vNodePath.replace(/\.[a-z0-9\-\_]{1,}$/i,"");
                            !utils.isEmpty(parentNode) && parentNode !== vNodePath && this.callEventAction(evt, eventName, eventNode.path, parentNode);
                        }
                    } else {
                        throw new Error(`执行事件回调出现错误:${resp.message}`);
                    }
                }).catch((error) => {
                    error["from"] = "virtual event module";
                    throw error;
                });
            }
        }
    }
    private createEventHandler(): Function {
        return (evt:Event) => {
            const target = evt.target;
            const path = (target as any).path;
            const vNodePath = (target as any).vNodePath;
            const eventName = evt.type;
            if(!utils.isEmpty(path) && !utils.isEmpty(vNodePath)) {
                this.callEventAction(evt, eventName, path, vNodePath);
            }
        };
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
