// tslint:disable: ordered-imports
import { HtmlParse, IVirtualElement, VirtualNode, VirtualRender } from "elmer-virtual-dom";
import { queueCallFunc, utils as comUtils } from "elmer-common";
import { Component } from "../component";
import { getComponents } from "../decorators/loadComponents";
import { Autowired } from "../decorators";
import { pluginExec } from "../decorators/Plugin";
import { RenderQueue, TypeRenderQueueOptions } from "./RenderQueue";
import { ElmerWorker } from "elmer-worker";
import { ElmerEvent } from "../events/ElmerEvent";
import { TOKEN_PLUGIN_RENDER, ElmerRenderNode } from "./ElmerRenderNode";
import { TypeElmerRenderDispatchNodes, TypeElmerRenderOptions, TypeRenderGetNodeResult, TypeVirtualRenders } from "./IElmerRender";
import elmerRenderAction from "./ElmerRenderAction";
import utils from "../lib/utils";
import { RenderMiddleware } from "../middleware/RenderMiddleware";
import { isNodeComponent } from "./Initialization";

export class ElmerRender {

    isDidMount: boolean;
    lastVirtualNode: IVirtualElement;
    options: TypeElmerRenderOptions;
    virtualRenderObj: TypeVirtualRenders = {};
    tagName: string;

    private useComponents: any;
    private htmlCode: String;
    private virtualId: string;
    private srcVdom: IVirtualElement;

    private wikiNodes: TypeElmerRenderDispatchNodes[] = [];

    @Autowired()
    private renderQueue: RenderQueue;

    @Autowired()
    private worker: ElmerWorker;

    @Autowired()
    private eventObj: ElmerEvent;

    @Autowired(VirtualNode)
    private virtualRender: VirtualRender;

    @Autowired()
    private elmerRenderNode: ElmerRenderNode;

    @Autowired()
    private middleware: RenderMiddleware;

    constructor(options: TypeElmerRenderOptions) {
        const importComponents = getComponents(options.ComponentFactory);
        this.options = options;
        this.useComponents = {
            ...options.useComponents,
            ...importComponents
        };
        (this.options.component as any).dom = {};
        (this.options.component as any).setState = this.setComponentState.bind(this);
        this.virtualId = this.options.vdom.virtualID;
        this.tagName = this.options.vdom.tagName;
        elmerRenderAction.callLifeCycle(this.options.component as any, "$init");
        this.elmerRenderNode.setSessionAction(this.options.vdom.virtualID, {
            ComponentFactory: this.options.ComponentFactory,
            component: this.options.component,
            depth: this.options.depth,
            eventListeners: [],
            getComponentFirstElement: (virtualId: string): TypeRenderGetNodeResult => {
                if(this.virtualRenderObj[virtualId]) {
                    return (this.virtualRenderObj[virtualId] as ElmerRender).getFirstDom();
                } else {
                    return {
                        isDidMount: false
                    };
                }
            },
            getComponentLastElement: (virtualId: string): TypeRenderGetNodeResult => {
                if(this.virtualRenderObj[virtualId]) {
                    return (this.virtualRenderObj[virtualId] as ElmerRender).getLastDom();
                } else  {
                    return {
                        isDidMount: false
                    };
                }
            },
            getRender: (virtualId: string) => {
                return this.virtualRenderObj[virtualId];
            },
            registeComponents: (components: any): void => {
                if(components) {
                    Object.keys(components).map((selector: string): void => {
                        if(!this.useComponents[selector]) {
                            this.useComponents[selector] = components[selector];
                        }
                    });
                }
            },
            removeRender: (virtualId: string): void => {
                if(this.virtualRenderObj[virtualId]) {
                    this.virtualRenderObj[virtualId].destory();
                }
                delete this.virtualRenderObj[virtualId];
            },
            saveRender: (virtualId: string, newRender: any): void => {
                this.virtualRenderObj[virtualId] = newRender;
            },
            // tslint:disable-next-line: object-literal-sort-keys
            nodePath: this.options.path,
            nodeId: this.virtualId,
            useComponents: this.useComponents
        });
        this.eventObj.dispose();
    }
    async render(options: TypeRenderQueueOptions): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const eventOptions = {
                Component: this.options.ComponentFactory,
                componentObj: this.options.component,
                nodeData: this.options.vdom,
                props: { ...((this.options.component as any).props||{}), ...(options.props || {}) },
                state: (this.options.component as any).state,
            };
            this.renderQueue.startAction(this.options.vdom.virtualID, options, this.renderAction.bind(this), () => {
                if(options?.firstRender) {
                    elmerRenderAction.callLifeCycle(this.options.component, "$didMount", eventOptions);
                    this.middleware.didMount({
                        Component: this.options.ComponentFactory as any,
                        componentObj: this.options.component as any,
                        nodeData: this.options.vdom,
                        props: (this.options.component as any).props
                    });
                } else {
                    elmerRenderAction.callLifeCycle(this.options.component, "$didUpdate", eventOptions);
                }
                resolve({});
            }).catch((err) => {
                if(options?.firstRender) {
                    elmerRenderAction.callLifeCycle(this.options.component, "$didMount", eventOptions);
                } else {
                    elmerRenderAction.callLifeCycle(this.options.component, "$didUpdate", eventOptions);
                }
                const errMsg = err.stack ? err.stack : (err.exception?.exception ? err.exception.exception.stack : err.exception?.stack);
                // tslint:disable-next-line: no-console
                console.error(errMsg || err);
                reject(err);
            });
        });
    }
    /**
     * 获取最后一个渲染的真实元素
     */
    getLastDom(): TypeRenderGetNodeResult {
        if(this.isDidMount) {
            let findDom = null;
            if (this.lastVirtualNode && this.lastVirtualNode.children) {
                for (let i = this.lastVirtualNode.children.length - 1; i >= 0; i--) {
                    if (this.lastVirtualNode.children[i].status !== "DELETE") {
                        const lVdom = this.lastVirtualNode.children[i];
                        if ((lVdom as any).isComponent) {
                            if (this.virtualRenderObj[lVdom.virtualID]) {
                                findDom = (this.virtualRenderObj[lVdom.virtualID] as ElmerRender).getLastDom()?.dom;
                            }
                        } else {
                            findDom = this.lastVirtualNode.children[i].dom as any;
                        }
                    }
                }
            }
            if(!findDom) {
                findDom = this.options.previousSibling;
            }
            return ({
                dom: findDom,
                isDidMount: true,
                tagName: this.tagName,
                vdoms: this.lastVirtualNode
            }) as any;
        } else {
            return {
                dom: this.options.previousSibling,
                isDidMount: false
            };
        }
    }
    /**
     * 获取第一个渲染到browser的元素
     */
    getFirstDom():TypeRenderGetNodeResult {
        if(this.isDidMount) {
            let findDom = null;
            if(this.lastVirtualNode && this.lastVirtualNode.children) {
                for(let i=0;i<this.lastVirtualNode.children.length;i++) {
                    if(this.lastVirtualNode.children[i].status !== "DELETE") {
                        const lVdom = this.lastVirtualNode.children[i];
                        if(!utils.isEmpty(lVdom.virtualID)) {
                            if(this.virtualRenderObj[lVdom.virtualID]) {
                                findDom = (this.virtualRenderObj[lVdom.virtualID] as ElmerRender).getFirstDom()?.dom;
                            }
                        } else {
                            findDom = this.lastVirtualNode.children[i].dom as any;
                        }
                    }
                }
            }
            if(!findDom) {
                findDom = this.options.previousSibling;
            }
            return {
                dom: findDom,
                isDidMount: true
            };
        } else {
            return {
                dom: this.options.previousSibling,
                isDidMount: false
            };
        }
    }
    destory(): void {
        // TODO: 需要在此处释放所有事件监听
        // 释放渲染插件调用对象
        this.elmerRenderNode.destory(this.options.vdom.virtualID);
    }
    private setComponentState(state: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if(utils.isObject(state)) {
                const component: any = this.options.component;
                const stateKeys = Object.keys(state);
                let dataChanged = false;
                if(component.state) {
                    for(const sKey of stateKeys) {
                        if(utils.isObject(state[sKey]) && utils.isObject(component.state[sKey])) {
                            if(!comUtils.isEqual(state[sKey], component.state[sKey])) {
                                dataChanged = true;
                                break;
                            }
                        } else {
                            if(state[sKey] !== component.state[sKey]) {
                                dataChanged = true;
                                break;
                            }
                        }
                    }
                } else {
                    dataChanged = true;
                }
                if(dataChanged) {
                    const newState = {
                        ...(component.state || {}),
                        ...state
                    };
                    delete component.state;
                    component.state = newState;
                    this.render({
                        firstRender: false,
                        state
                    }).then(() => {
                        resolve({});
                    }).catch((err) => {
                        typeof this.options.component["$error"] === "function" && this.options.component["$error"](err);
                        reject(err);
                    });
                } else {
                    resolve({});
                }
            } else {
                throw new Error("setState action get an wrong data,it\"s must be an object!");
            }
        });
    }
    private callLifeCycle(eventName: keyof Component, ...args: any[]):any {
        return elmerRenderAction.callLifeCycle(this.options.component, eventName, ...args);
    }
    private async renderAction(options:TypeRenderQueueOptions): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            queueCallFunc([
                {
                    id: "transformSource",
                    params: null,
                    // tslint:disable-next-line: object-literal-sort-keys
                    fn: () => this.getSourceCode(options)
                },{
                    id: "startRender",
                    params: null,
                    // tslint:disable-next-line: object-literal-sort-keys
                    fn: (opt): any => {
                        return this.startRenderAction({
                            options,
                            vdom: opt.lastResult
                        });
                    }
                }
            ], null, {
                throwException: true
            }).then((resp) => {
                resolve(resp);
            }).catch((err) => {
                reject(err);
            });
        });
    }
    private async startRenderAction(opt:any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const options:TypeRenderQueueOptions = opt.options;
            const vdom: IVirtualElement = opt.vdom;
            this.virtualRender.on(this.virtualId, "onAfterRender", (evt: any) => {
                this.callLifeCycle("$afterVirtualRender", evt);
            });
            const stillNeedVirtualRender = this.callLifeCycle("$beforeVirtualRender", vdom);
            // 在虚拟节点数据渲染前人为中断操作
            if(undefined !== stillNeedVirtualRender && null !== stillNeedVirtualRender && !stillNeedVirtualRender) {
                resolve({});
                return;
            }
            const newDom = this.virtualRender.render(vdom, this.lastVirtualNode, this.options.component, {
                children: this.options.children,
                rootPath: this.options.path,
                sessionId: this.virtualId
            });
            const stillNeedRender = this.callLifeCycle("$beforeRender", {
                props: (this.options.component as any).props,
                vdom: newDom
            });
            // 在进入实际渲染阶段人为停止渲染操作
            if(undefined !== stillNeedRender && null !== stillNeedRender && !stillNeedRender) {
                resolve({});
                return;
            }
            if(newDom.deleteElements?.length >0) {
                this.elmerRenderNode.releaseOutJourneyNodes(this.options.vdom.virtualID, newDom.deleteElements);
            }
            this.elmerRenderNode.vdomRender({
                component: this.options.component,
                isFirstLevel: true,
                isNewAction: true,
                sessionId: this.options.vdom.virtualID,
                token: utils.guid()
            }, {
                ElmerRender,
                container: this.options.container,
                previousSibling: this.getFirstDom()?.dom,
                vdomParent: newDom,
                vdoms: newDom.children
            }).then((vResp) => {
                this.isDidMount = true;
                this.lastVirtualNode = newDom;
                resolve(vResp);
            }).catch((err) => {
                this.isDidMount = true;
                reject(err);
            });
        });
    }
    private async getSourceCode(options:TypeRenderQueueOptions):Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const com = (this.options.component as any);
            const isFunc: boolean = !isNodeComponent(this.options.ComponentFactory);
            const props = isFunc ? {
                ...(this.options.props),
                ...(options.props || {}),
                ...(this.options.vdom.events || {})
            } : null;
            let vRender: Function;
            // render方法经过initializtion 方法初始化以后重写过此方法，返回的是一个Promise结果
            if(typeof com.$render === "function") {
                vRender = com.$render;
            } else {
                vRender = com.render;
            }
            if(isFunc) {
                com.props = props;
            }
            queueCallFunc([
                {
                    id: "readSourceCode",
                    params: null,
                    // tslint:disable-next-line: object-literal-sort-keys
                    fn: async () => {
                        const vitualNodes = await vRender(props || {}, this.options.vdom.tagName);
                        const hookUserComponent = getComponents(this.options.ComponentFactory);
                        this.useComponents = {
                            ...this.useComponents,
                            ...(hookUserComponent || {})
                        };
                        return vitualNodes;
                    }
                }, {
                    id: "htmlParse",
                    params: null,
                    // tslint:disable-next-line: object-literal-sort-keys
                    fn: (opt) => {
                        // tslint:disable-next-line: variable-name
                        return new Promise((__resolve, __reject) => {
                            // 当方法或者高阶组件返回的是html代码的时候只有html代码变化才会调用htmlParse进行解析，否则使用已经解析好的数据即可
                            // 一次解析过html代码以后如果再次通过render函数返回的代码或虚拟节点不变不需要再次进行解析，减少解析过程提升性能
                            if(utils.isString(opt.lastResult)) {
                                if(opt.lastResult !== this.htmlCode) {
                                    this.worker.callObjMethod("htmlParse", "parse", opt.lastResult)
                                        .then((resp) => __resolve(resp.data))
                                        .catch((err) => __reject(err));
                                } else {
                                    __resolve(this.srcVdom);
                                }
                            } else {
                                __resolve(opt.lastResult);
                            }
                        });
                    }
                }
            ], null, {
                throwException: true
            }).then((allResp) => {
                this.srcVdom = allResp.htmlParse;
                resolve(allResp.htmlParse);
            }).catch((allErr) => {
                reject({
                    message: allErr.message,
                    stack: allErr?.exception?.stack,
                    statusCode: allErr.statusCode
                });
            });
        });
    }
}
// tslint:enable: ordered-imports
