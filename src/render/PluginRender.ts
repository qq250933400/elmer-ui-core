import { queueCallFunc } from "elmer-common";
import { IVirtualElement } from "elmer-virtual-dom";
import { Component } from "../component";
import { Plugin, pluginExec } from "../decorators/Plugin";
import utils from "../lib/utils";
import elmerRenderAction from "./ElmerRenderAction";

export const TOKEN_PLUGIN_RENDER = "PluginRender_54ba9eda-95eb-4fbe-ae29-6114985e9c7f";

type TypeVirtualAttachOptions = {
    vdom: IVirtualElement;
    vdomParent: IVirtualElement;
    container: HTMLElement;
    isHtmlNode: boolean;
    sessionId: string;
};
type TypeVirtualSessionAction = {
    getComponentLastElement(virtualId: string): HTMLElement | null | undefined;
    getComponentFirstElement(virtualId: string): HTMLElement | null | undefined;
};
type TypeVirtualRenderSession<T={}> = {[P in keyof T]: TypeVirtualSessionAction};

@Plugin("NodeRender", {
    token: TOKEN_PLUGIN_RENDER
})
export class PluginRender {
    private useComponents: any = {};
    private vNodeRenders: any = {};
    private sessionNodes: TypeVirtualRenderSession = {};
    setComponents({}, components: any): void {
        this.useComponents = components;
    }
    setSessionAction(virtualId: string, actions: TypeVirtualRenderSession): void {
        this.sessionNodes[virtualId] = actions;
    }
    vdomRender(opt: any, vdoms: IVirtualElement[], fn?: Function):Promise<any> {
        return new Promise((resolve, reject) => {
            const { sessionId } = opt;
            if(vdoms?.length > 0) {
                const userComponentRender = [];
                let hasComponent = false;
                vdoms.map((vdom, index) => {
                    if(vdom.status !== "DELETE") {
                        const ComponentFactory = this.useComponents[vdom.tagName];
                        if(!ComponentFactory) {
                            if(vdom.status === "APPEND") {
                                vdom.dom = elmerRenderAction.createNodeByVdom(vdom);
                            } else {
                                if(!vdom.dom) {
                                    vdom.dom = elmerRenderAction.createNodeByVdom(vdom);
                                }
                            }
                            if(["UPDATE", "APPEND", "MOVEUPDATE"].indexOf(vdom.status) >= 0) {
                                elmerRenderAction.renderAttr(vdom.dom as any, vdom);
                                pluginExec({
                                    name: "vdomRenderAttr",
                                    type: "NodeRender"
                                }, vdom.dom, vdom);
                            }
                            if(vdom.children?.length > 0) {
                                this.vdomRender(opt, vdom.children, (vNode, isHtmlNode) => {
                                    this.vdomAttatch(opt, {
                                        container: vdom.dom as any,
                                        isHtmlNode,
                                        sessionId,
                                        vdom: vNode,
                                        vdomParent: vdom
                                    });
                                });
                            }
                            typeof fn === "function" && fn(vdom, !ComponentFactory);
                        } else {
                            hasComponent = true;
                            userComponentRender.push({
                                id: "ComponentRender_" + index,
                                params: {
                                    ComponentFactory,
                                    vdom
                                }
                            });
                        }
                    }
                });
                if(!hasComponent) {
                    queueCallFunc(userComponentRender, ({}, param): Promise<any> => {
                        return this.vdomRenderComponent(param.vdom, param.ComponentFactory);
                    })
                    .then(() => resolve({}))
                    .catch((err) => reject(err));
                } else {
                    resolve({});
                }
            } else {
                resolve({});
            }
        });
    }
    vdomRenderComponent(vdom:IVirtualElement, ComponentFactory: Function|Component): Promise<any> {
        return new Promise<any>((resolve) => {
            resolve({});
        });
    }
    vdomAttatch({}, attachOptions: TypeVirtualAttachOptions): void {
        const {vdom, vdomParent, container, isHtmlNode, sessionId} = attachOptions;
        if(vdom.status === "APPEND" || vdom.status === "MOVE" || vdom.status === "MOVEUPDATE") {
            const sessionAction: TypeVirtualSessionAction = this.sessionNodes[sessionId];
            if(isHtmlNode) {
                const prevDom = elmerRenderAction.getPrevDom(vdom, vdomParent);
                if(!prevDom) {
                    // 第一个元素，需要插入到最前面
                    const nextNode = elmerRenderAction.getNextDom(vdom, vdomParent);
                    if(nextNode) {
                        if(utils.isEmpty(nextNode.virtualID)) {
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
                            if(nextDom) {
                                container.insertBefore(vdom.dom, nextDom);
                            } else {
                                container.appendChild(vdom.dom);
                            }
                        }
                    } else {
                        // 只有一个节点的时候
                        container.appendChild(vdom.dom);
                    }
                } else {
                    if(utils.isEmpty(prevDom.virtualID)) {
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
                        // 当前组件的前一个组件为自定义组件时，获取组件第一层最后一个节点，用于做插入坐标
                        const prevNodeElement = sessionAction.getComponentLastElement(prevDom.virtualID);
                        if(prevNodeElement) {
                            if(prevNodeElement.nextSibling) {
                                container.insertBefore(vdom.dom, prevNodeElement.nextSibling);
                            } else {
                                container.appendChild(vdom.dom);
                            }
                        } else {
                            // 当前一个节点未找到真实节点时将当前元素插入第一个或则追加到最后
                            if(container.children.length > 0) {
                                container.insertBefore(vdom.dom, container.children[0]);
                            } else {
                                container.appendChild(vdom.dom);
                            }
                        }
                    }
                }
            }
        }
    }
    destory(sessionId: string): void {
        delete this.sessionNodes[sessionId];
    }
}
