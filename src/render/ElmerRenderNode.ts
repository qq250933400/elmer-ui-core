import { queueCallFunc } from "elmer-common";
import { IVirtualElement } from "elmer-virtual-dom";
import { Component } from "../component";
import { Autowired, Service } from "../decorators";
import { getComponents } from "../decorators/loadComponents";
import { ElmerEvent } from "../events/ElmerEvent";
import { TypeDomEventOptions } from "../events/IEventContext";
// tslint:disable-next-line: ordered-imports
import utils from "../lib/utils";
import elmerRenderAction from "./ElmerRenderAction";
import {
    IElmerRender,
    TypeRenderGetNodeResult,
    TypeRenderSession,
    TypeVirtualRenderSession
} from "./IElmerRender";
import { Initialization } from "./Initialization";

export const TOKEN_PLUGIN_RENDER = "PluginRender_54ba9eda-95eb-4fbe-ae29-6114985e9c7f";

type TypeVirtualAttachOptions = {
    vdom: IVirtualElement;
    vdomParent: IVirtualElement;
    container: HTMLElement;
    isHtmlNode: boolean;
    sessionId: string;
};
type TypeVirtualRenderOptions = {
    container: HTMLElement;
    vdoms: IVirtualElement[];
    vdomParent: IVirtualElement;
    hasPathChange?: boolean;
    previousSibling?: HTMLElement;
    ElmerRender: new(...args: any) => any;
};
type TypeRenderOption = {
    sessionId: string,
    token: string;
    isNewAction?: boolean;
    isFirstLevel?: boolean;
    component: any;
    useComponents: any;
};

type TypeRenderComponentOptions = {
    vdom:IVirtualElement;
    vdomParent: IVirtualElement;
    parent: any;
    container: HTMLElement;
    ComponentFactory: Function|Component;
    sessionId: string;
    ElmerRender: new(...args: any) => any;
};

@Service
export class ElmerRenderNode {

    @Autowired()
    private eventObj: ElmerEvent;

    private renderSessions: TypeVirtualRenderSession = {};
    setSessionAction(virtualId: string, actions: TypeRenderSession): void {
        this.renderSessions[virtualId] = actions;
    }
    getSessionAction(sessionId: string): TypeRenderSession {
        return this.renderSessions[sessionId];
    }
    vdomRender(opt: TypeRenderOption, options: TypeVirtualRenderOptions):Promise<any> {
        return new Promise((resolve, reject) => {
            const { sessionId, token } = opt;
            const { vdoms, vdomParent, ElmerRender } = options;
            const sessionAction: TypeRenderSession = this.renderSessions[sessionId];
            if(opt.isNewAction) {
                sessionAction.token = token;
            }
            if(!sessionAction) {
                resolve({});
                return;
            }
            if(vdoms?.length > 0) {
                const userComponentRender = [];
                const scheduleAttachList = [];
                let hasComponent = false;
                let hasPathChange = options.hasPathChange;
                for(let index=0;index<vdoms.length;index++) {
                    const vdom = vdoms[index];
                    const ComponentFactory = this.getUseComponent(sessionId, vdom.tagName);
                    if(ComponentFactory) {
                        (vdom as any).isComponent = true;
                    }
                    if(vdom.status !== "DELETE") {
                        if(!ComponentFactory) {
                            //原生dom元素
                            let needAppendChild = false;
                            if(vdom.status === "APPEND") {
                                vdom.dom = elmerRenderAction.createNodeByVdom(vdom);
                                
                                hasPathChange = true;
                                if(!utils.isEmpty(vdom.props.id)) {
                                    if(!opt.component.dom) {
                                        opt.component.dom = {};
                                    }
                                    opt.component.dom[vdom.props.id] = vdom.dom;
                                }
                            } else {
                                if(!vdom.dom) {
                                    // 由于其他不可知原因导致无法追踪真实dom节点，需要重新创建
                                    vdom.dom = elmerRenderAction.createNodeByVdom(vdom);
                                    vdom.status = "APPEND";
                                    needAppendChild = true;
                                }
                            }
                            if(["UPDATE", "APPEND", "MOVEUPDATE"].indexOf(vdom.status) >= 0) {
                                elmerRenderAction.renderAttr(vdom.dom as any, vdom);
                            }
                            if(["APPEND", "MOVE", "MOVEAPPEND"].indexOf(vdom.status) >= 0) {
                                hasPathChange = true;
                            }
                            if(vdom.children?.length > 0) {
                                this.vdomRender({
                                    ...opt,
                                    isFirstLevel: false,
                                    isNewAction: false
                                }, {
                                    ElmerRender,
                                    container: vdom.dom as any,
                                    hasPathChange,
                                    vdomParent: vdom,
                                    vdoms: vdom.children
                                }).then(() => {
                                    elmerRenderAction.connectNodeRender({
                                        container: vdom.dom as any,
                                        sessionId: vdom.virtualID,
                                        vRender: {},
                                        vdom,
                                        vdomParent,
                                        // tslint:disable-next-line: object-literal-sort-keys
                                        getRenderSession: this.getSessionAction.bind(this)
                                    });
                                }).catch((err) => {
                                    const msg = err?.exception?.stack || err?.exception || err;
                                    // tslint:disable-next-line: no-console
                                    console.error(msg);
                                });
                            }
                            if(!opt.isFirstLevel) {
                                if((["APPEND", "MOVE", "MOVEAPPEND"].indexOf(vdom.status) >= 0 || needAppendChild)) {
                                    if(!this.vdomAttatch({}, {
                                        container: options.container,
                                        isHtmlNode: true,
                                        sessionId,
                                        vdom,
                                        vdomParent
                                    })) {
                                        scheduleAttachList.push({
                                            container: options.container,
                                            parent: opt.component,
                                            vdom,
                                            vdomParent
                                        });
                                    }
                                }
                            } else {
                                // 第一级需要放到最后再去挂载
                                scheduleAttachList.push({
                                    container: options.container,
                                    vdom,
                                    vdomParent
                                });
                            }
                            // 渲染事件检查，有时间监听添加到EventManager
                            this.vdomEventRender(sessionId, vdom, hasPathChange);
                        } else {
                            hasComponent = true;
                            userComponentRender.push({
                                id: "ComponentRender_" + index,
                                params: {
                                    ComponentFactory,
                                    ElmerRender,
                                    container: options.container,
                                    parent: opt.component,
                                    sessionId,
                                    vdom,
                                    vdomParent
                                }
                            });
                        }
                    } else {
                        if(!utils.isEmpty(vdom.props.id)) {
                            if(opt.component.dom && opt.component.dom[vdom.props.id]) {
                                delete opt.component.dom[vdom.props.id];
                            }
                        }
                        this.releaseOutJourneyNodes(sessionId, [vdom]);
                    }
                    if(vdom.deleteElements?.length > 0) {
                        this.releaseOutJourneyNodes(sessionId, vdom.deleteElements);
                    }
                    if(sessionAction.token !== token) {
                        resolve({
                            message: "被新的渲染任务中断",
                            statusCode: "VR_501"
                        });
                        return;
                    }
                }
                if(hasComponent) {
                    // 新任务不中断自定义组件的渲染
                    // TODO: 需后续测试中断渲染任务是否影响后面的节点
                    queueCallFunc(userComponentRender, ({}, param): Promise<any> => {
                        return this.vdomRenderComponent(param);
                    }, {
                        throwException: true
                    })
                    .then(() => {
                        if(scheduleAttachList.length > 0) {
                            scheduleAttachList.forEach((scheduleNode) => {
                                this.vdomAttatch({}, {
                                    ...scheduleNode,
                                    isHtmlNode: true,
                                    sessionId
                                });
                            });
                        }
                        resolve({});
                    })
                    .catch((err) => reject(err));
                } else {
                    if(scheduleAttachList.length > 0) {
                        scheduleAttachList.forEach((scheduleNode) => {
                            this.vdomAttatch({}, {
                                ...scheduleNode,
                                isHtmlNode: true,
                                sessionId
                            });
                        });
                    }
                    resolve({});
                }
            } else {
                resolve({});
            }
        });
    }
    vdomRenderComponent(options: TypeRenderComponentOptions): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const { vdom, vdomParent, ComponentFactory, container, sessionId, parent, ElmerRender} = options;
            const sessionAction: TypeRenderSession = this.renderSessions[sessionId];
            if(vdom.status === "APPEND") {
                const component = Initialization(ComponentFactory, {
                    depth: 0,
                    vdom,
                    // tslint:disable-next-line: object-literal-sort-keys
                    registeComponents: sessionAction.registeComponents
                });
                const vRender = new ElmerRender({
                    ComponentFactory: ComponentFactory as any,
                    children: vdom.children,
                    component,
                    container,
                    depth: sessionAction.depth + 1,
                    nextSibling: elmerRenderAction.getNextDom(vdom, vdomParent)?.dom,
                    path: vdom.path,
                    previousSibling: elmerRenderAction.getPrevDom(vdom, vdomParent, {
                        getFirstNode: sessionAction.getComponentFirstElement,
                        getLastNode: sessionAction.getComponentLastElement,
                        hasDomNode: true
                    })?.dom,
                    props: {
                        ...(vdom.props),
                        ...(vdom.events || {})
                    },
                    useComponents: {
                        ...(sessionAction.useComponents || {}),
                        ...(getComponents(ComponentFactory))
                    },
                    vdom,
                    parent: options.parent
                });
                (vRender as IElmerRender).render({
                    firstRender: true
                }).then((resp) => {
                    elmerRenderAction.connectNodeRender({
                        container,
                        sessionId,
                        vRender,
                        vdom,
                        vdomParent,
                        // tslint:disable-next-line: object-literal-sort-keys
                        getRenderSession: this.getSessionAction.bind(this)
                    });
                    resolve(resp);
                }).catch((err) => {
                    reject(err);
                });
                if(!utils.isEmpty(vdom.props.id)) {
                    parent.dom[vdom.props.id] = component;
                }
                sessionAction.saveRender(vdom.virtualID, vRender);
            } else if(vdom.status === "UPDATE") {
                const vRender = sessionAction.getRender(vdom.virtualID);
                vRender.render({
                    firstRender: false,
                    props: {
                        ...(vdom.props || {}),
                        ...(vdom.changeAttrs || {}),
                        ...(vdom.events || {})
                    }
                }).then(resolve).catch(reject);
            } else if(vdom.status === "DELETE") {
                const vRender = sessionAction.getRender(vdom.virtualID);
                if(!utils.isEmpty(vdom.props.id)) {
                    delete parent.dom[vdom.props.id];
                }
                vRender.destory();
            } else {
                resolve({
                    message: "不需要渲染的组件",
                    statusCode: "VR_502",
                    tagName: vdom.tagName
                });
            }
        });
    }
    vdomAttatch({}, attachOptions: TypeVirtualAttachOptions): boolean {
        const {vdom, vdomParent, container, isHtmlNode, sessionId} = attachOptions;
        let hasAttached = true;
        if(vdom.status === "APPEND" || vdom.status === "MOVE" || vdom.status === "MOVEUPDATE") {
            const sessionAction: TypeRenderSession = this.renderSessions[sessionId];
            const useComponents = sessionAction.useComponents || {};
            if(isHtmlNode) {
                const prevDom = elmerRenderAction.getPrevDom(vdom, vdomParent);
                if(!prevDom) {
                    // 未获取到当前元素的前一个元素，则是当前节点为第一个节点或者为自定义组件的第一个元素
                    // 第一个元素，需要插入到最前面
                    const nextNode = elmerRenderAction.getNextDom(vdom, vdomParent);
                    if(nextNode) {
                        const isComponent = useComponents[nextNode.tagName] ? true : false;
                        if(!isComponent) {
                            // this node is the html node if the virtualID is empty
                            if(nextNode && nextNode.dom) {
                                // tslint:disable-next-line: no-console
                                container.insertBefore(vdom.dom, nextNode.dom);
                            } else {
                                container.appendChild(vdom.dom);
                            }
                        } else {
                            // this node is the component if the virtualID is not isEmpty
                            // the virtualId will be created when the component was initialized.
                            const nextDom = sessionAction.getComponentFirstElement(nextNode.virtualID);
                            if(nextDom.isDidMount && nextDom.dom) {
                                // tslint:disable-next-line: no-console
                                container.insertBefore(vdom.dom, nextDom.dom);
                            } else {
                                // 未找到相邻的下一个节点，证明当前节点为最后一个元素或渲染逻辑错误，放入schedule task
                                hasAttached = false;
                            }
                        }
                    } else {
                        // 只有一个节点的时候
                        container.appendChild(vdom.dom);
                    }
                } else {
                    // 获取到前一个节点数据
                    // 判断是否是自定义组件
                    const isComponent = useComponents[prevDom.tagName] ? true : false;
                    if(!isComponent) {
                        // prev node is a html element not a user component;
                        if(prevDom.dom) {
                            if(prevDom.dom.nextSibling) {
                                // tslint:disable-next-line: no-console
                                console.log("3.",vdom.tagName,prevDom.dom.nextSibling.parentElement === container);
                                container.insertBefore(vdom.dom, prevDom.dom.nextSibling);
                            } else {
                                container.appendChild(vdom.dom);
                            }
                        } else {
                            // 当前节点的前一个节点不是自定义组件，也没有对应的真实节点，这种情况是不可能出现的
                            // 如果执行到此处证明渲染逻辑已经出现问题
                            // 当前做法是为了显示出现错误的元素,
                            if((vdom.dom as HTMLElement).style) {
                                (vdom.dom as HTMLElement).style.border = "1px solid red";
                            }
                            if(container.children.length > 0) {
                                container.insertBefore(vdom.dom, container.children[0]);
                            } else {
                                container.appendChild(vdom.dom);
                            }
                            // tslint:disable-next-line: no-console
                            console.error("渲染出错请联系作者检查逻辑(RL_500)");
                        }
                    } else {
                        // 上一节点为自定义组件，获取自定义组件的最后一个
                        // 当前组件的前一个组件为自定义组件时，获取组件第一层最后一个节点，用于做插入坐标
                        const prevNodeElement = sessionAction.getComponentLastElement(prevDom.virtualID);
                        if(prevNodeElement.isDidMount) {
                            // 相邻节点元素存在
                            if(prevNodeElement.dom?.nextSibling) {
                                // tslint:disable-next-line: no-console
                                console.log("4.",vdom.tagName,prevNodeElement.dom.nextSibling.parentElement === container);
                                container.insertBefore(vdom.dom, prevNodeElement.dom?.nextSibling);
                            } else {
                                container.appendChild(vdom.dom);
                            }
                        } else {
                            // 相邻节点元素不存在
                            // 当前一个节点未找到真实节点时将当前元素插入第一个或则追加到最后
                            // 放到临时任务列表，渲染结束后再此挂载到真实节点
                            hasAttached = false;
                        }
                    }
                }
            }
        }
        return hasAttached;
    }
    destory(sessionId: string): TypeRenderSession {
        const currentSession: TypeRenderSession = this.renderSessions[sessionId];
        if(currentSession) {
            this.eventObj.unsubscribe(currentSession.nodeId);
            delete this.renderSessions[sessionId];
        }
        return currentSession;
    }
    releaseOutJourneyNodes(sessionId: string,vNodes:IVirtualElement[]): void {
        const currentSession: TypeRenderSession = this.renderSessions[sessionId];
        vNodes?.length > 0 && vNodes.forEach((vdom) => {
            if((vdom as any).isComponent) {
                const render = currentSession.getRender(vdom.virtualID);
                render?.destory();
            } else {
                this.releaseEventsByNode(vdom);
                if(vdom.children?.length > 0) {
                    this.releaseOutJourneyNodes(sessionId,vdom.children);
                }
                vdom.dom?.parentElement && vdom.dom.parentElement.removeChild(vdom.dom);
                vdom.dom = null;
            }
        });
    }
    /**
     * 添加节点事件监听
     * @param sessionId 当前事务执行ID
     * @param vdom 检测虚拟节点
     * @param hasPathChange 是否节点位置有变化
     */
    private vdomEventRender(sessionId: string, vdom:IVirtualElement, hasPathChange: boolean): void {
        if(hasPathChange) {
            const allEvents = {...(vdom.events || {})};
            const eventKeys = Object.keys(allEvents);
            const eventOptions: TypeDomEventOptions = (vdom?.dom as any)?.EUIEventsOption
            if(allEvents && eventKeys.length > 0) {
                const oldEvents = JSON.parse(JSON.stringify(eventOptions?.events || {}));
                const sessionAction: TypeRenderSession = this.renderSessions[sessionId];
                if(vdom.status !== "DELETE") {
                    // 检测路径是否有变化，有变化更新信息
                    if(eventOptions && JSON.stringify(eventOptions.path) !== JSON.stringify(vdom.path)) {
                        this.eventObj.updateEventPath(eventOptions.events, vdom.path);
                        eventOptions.path = vdom.path;
                        (vdom?.dom as any).EUIEventsOption = eventOptions; // 更新最新的路径到绑定节点
                    }
                    Object.keys(allEvents).forEach((eventName: string): void => {
                        const hasSubscribe = eventOptions?.events[eventName] ? true : false;
                        if(!hasSubscribe) {
                            if(typeof allEvents[eventName] === "function") {
                                const eventId = this.eventObj.subscribe(vdom.dom as any, {
                                    callback: ((obj: any, callback: Function) => {
                                        return (event:any) => {
                                            return callback.call(obj, event);
                                        };
                                    })(sessionAction.component, allEvents[eventName]),
                                    data: vdom.data,
                                    dataSet: vdom.dataSet,
                                    depth: sessionAction.depth,
                                    eventHandler: (allEvents[eventName] as Function).bind(this),
                                    eventName,
                                    path: vdom.path,
                                    target: vdom.dom as any,
                                    virtualId: sessionAction.nodeId,
                                    virtualNodePath: sessionAction.nodePath,
                                    virtualPath: sessionAction.nodePath.join("-")
                                });
                                sessionAction.eventListeners.push(eventId);
                            }
                        }
                        delete oldEvents[eventName];
                    });
                }
                // 由于前后渲染从html源码就删除的事件需要特殊处理，不推荐直接修改render返回的源码
                const leftEvents = Object.keys(oldEvents);
                if(leftEvents.length > 0) {
                    const removeEvents = [];
                    leftEvents.map((eventName) => {
                        removeEvents.push(leftEvents[eventName]);
                    });
                    this.eventObj.unsubscribe(null, removeEvents);
                }
            } else {
                if(eventOptions?.events) {
                    this.eventObj.unsubscribe(null, eventOptions.events);
                }
            }
        } else {
            if(vdom.status === "DELETE") {
                // 标记为删除状态的组件释放所有事件监听
                this.releaseEventsByNode(vdom);
            }
        }
    }
    /**
     * 释放指定节点所有事件监听
     * @param vdom - 需要释放事件监听的节点
     */
    private releaseEventsByNode(vdom:IVirtualElement): void {
        const eventOptions: TypeDomEventOptions = (vdom?.dom as any)?.EUIEventsOption;
        const oldEvents = JSON.parse(JSON.stringify(eventOptions?.events || {}));
        const leftEvents = Object.keys(oldEvents);
        if(leftEvents.length > 0) {
            const removeEvents = [];
            leftEvents.forEach((eventName) => {
                removeEvents.push(leftEvents[eventName]);
            });
            this.eventObj.unsubscribe(null, removeEvents);
        }
    }
    private getUseComponent(sessionId: string, tagName: string): Function|Component|null|undefined {
        const currentSession:TypeRenderSession = this.renderSessions[sessionId];
        if(currentSession) {
            const vComponents = getComponents(currentSession.ComponentFactory);
            const allComponents = {
                ...(currentSession.useComponents || {}),
                ...(vComponents || {})
            };
            return allComponents[tagName];
        }
        return null;
    }
}
