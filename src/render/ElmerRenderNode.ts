import { queueCallFunc } from "elmer-common";
import { IVirtualElement } from "elmer-virtual-dom";
import { Component } from "../component";
import { Service } from "../decorators";
import elmerRenderAction from "./ElmerRenderAction";
import { Initialization } from "./Initialization";
// tslint:disable-next-line: ordered-imports
import utils from "../lib/utils";
import {
    IElmerRender,
    TypeRenderGetNodeResult,
    TypeRenderSession,
    TypeVirtualRenderSession
} from "./IElmerRender";

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
    previousSibling?: HTMLElement;
    ElmerRender: new(...args: any) => any;
};
type TypeRenderOption = {
    sessionId: string,
    token: string;
    isNewAction?: boolean;
    isFirstLevel?: boolean;
};

type TypeRenderComponentOptions = {
    vdom:IVirtualElement;
    vdomParent: IVirtualElement;
    container: HTMLElement;
    ComponentFactory: Function|Component;
    sessionId: string;
    ElmerRender: new(...args: any) => any;
};

@Service
export class ElmerRenderNode {
    private renderSessions: TypeVirtualRenderSession = {};
    setSessionAction(virtualId: string, actions: TypeVirtualRenderSession): void {
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
            if(vdoms?.length > 0) {
                const userComponentRender = [];
                const scheduleAttachList = [];
                let hasComponent = false;
                for(let index=0;index<vdoms.length;index++) {
                    const vdom = vdoms[index];
                    if(vdom.status !== "DELETE") {
                        const ComponentFactory = this.getUseComponent(sessionId, vdom.tagName);
                        if(!ComponentFactory) {
                            let needAppendChild = false;
                            if(vdom.status === "APPEND") {
                                vdom.dom = elmerRenderAction.createNodeByVdom(vdom);
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
                            if(vdom.children?.length > 0) {
                                this.vdomRender({
                                    ...opt,
                                    isFirstLevel: false,
                                    isNewAction: false
                                }, {
                                    ElmerRender,
                                    container: vdom.dom as any,
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
                            if(!opt.isFirstLevel && (["APPEND", "MOVE", "MOVEAPPEND"].indexOf(vdom.status) >= 0 || needAppendChild)) {
                                if(!this.vdomAttatch({}, {
                                    container: options.container,
                                    isHtmlNode: true,
                                    sessionId,
                                    vdom,
                                    vdomParent
                                })) {
                                    scheduleAttachList.push({
                                        container: options.container,
                                        vdom,
                                        vdomParent
                                    });
                                }
                            }
                        } else {
                            hasComponent = true;
                            (vdom as any).isComponent = true;
                            userComponentRender.push({
                                id: "ComponentRender_" + index,
                                params: {
                                    ComponentFactory,
                                    ElmerRender,
                                    container: options.container,
                                    sessionId,
                                    vdom,
                                    vdomParent
                                }
                            });
                        }
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
                        console.log(scheduleAttachList, "+++++++");
                        resolve({});
                    })
                    .catch((err) => reject(err));
                } else {
                    console.log(scheduleAttachList, "---");
                    resolve({});
                }
            } else {
                resolve({});
            }
        });
    }
    vdomRenderComponent(options: TypeRenderComponentOptions): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const { vdom, vdomParent, ComponentFactory, container, sessionId, ElmerRender} = options;
            const sessionAction: TypeRenderSession = this.renderSessions[sessionId];
            if(vdom.status === "APPEND") {
                const component = Initialization(ComponentFactory, {
                    vdom
                });
                const vRender = new ElmerRender({
                    ComponentFactory: ComponentFactory as any,
                    children: vdom.children,
                    component,
                    container,
                    nextSibling: elmerRenderAction.getNextDom(vdom, vdomParent)?.dom,
                    path: [],
                    previousSibling: elmerRenderAction.getPrevDom(vdom, vdomParent, {
                        getFirstNode: sessionAction.getComponentFirstElement,
                        getLastNode: sessionAction.getComponentLastElement,
                        hasDomNode: true
                    })?.dom,
                    useComponents: sessionAction.useComponents || {},
                    vdom
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
                sessionAction.saveRender(vdom.virtualID, vRender);
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
                                container.insertBefore(vdom.dom, nextNode.dom);
                            } else {
                                container.appendChild(vdom.dom);
                            }
                        } else {
                            // this node is the component if the virtualID is not isEmpty
                            // the virtualId will be created when the component was initialized.
                            const nextDom = sessionAction.getComponentFirstElement(nextNode.virtualID);
                            if(nextDom.isDidMount && nextDom.dom) {
                                container.insertBefore(vdom.dom, nextDom.dom);
                            } else {
                                // 未找到相邻节点，放入schedule task
                                hasAttached = false;
                                console.error("some node can not be insert into browser dom correct", vdom);
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
                                container.insertBefore(vdom.dom, prevDom.dom.nextSibling);
                            } else {
                                container.appendChild(vdom.dom);
                            }
                        } else {
                            // 当前节点的前一个节点不是自定义组件，也没有对应的真实节点，这种情况是不可能出现的
                            // 如果执行到此处证明渲染逻辑已经出现问题
                            // 当前做法是为了显示出现错误的元素,
                            (vdom.dom as HTMLElement).style.border = "1px solid red";
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
                                container.insertBefore(vdom.dom, prevNodeElement.dom?.nextSibling);
                            } else {
                                container.appendChild(vdom.dom);
                            }
                        } else {
                            // 相邻节点元素不存在
                            // 当前一个节点未找到真实节点时将当前元素插入第一个或则追加到最后
                            hasAttached = false;
                            console.error("2. some node can not be insert into browser dom correct", vdom);
                        }
                    }
                }
            }
        }
        return hasAttached;
    }
    destory(sessionId: string): void {
        delete this.renderSessions[sessionId];
    }
    private getUseComponent(sessionId: string, tagName: string): Function|Component|null|undefined {
        const currentSession:TypeRenderSession = this.renderSessions[sessionId];
        if(currentSession) {
            return currentSession.useComponents ? currentSession.useComponents[tagName] : null;
        }
        return null;
    }
}
