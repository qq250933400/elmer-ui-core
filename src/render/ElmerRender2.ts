// tslint:disable: ordered-imports
import { HtmlParse, IVirtualElement, VirtualNode, VirtualRender } from "elmer-virtual-dom";
import { queueCallFunc } from "elmer-common";
import { Component } from "../component";
import { getComponents } from "../decorators/loadComponents";
import { Autowired } from "../decorators";
import { pluginExec } from "../decorators/Plugin";
import { RenderQueue, TypeRenderQueueOptions } from "./RenderQueue";
import { ElmerWorker } from "elmer-worker";
import { EventInWorker } from "../events/EventInWorker";
import { getServiceObj } from "../decorators/Autowired";
import { ElmerEvent } from "../events/ElmerEvent";
import { TOKEN_PLUGIN_RENDER, PluginRender } from "./PluginRender";
import { TypeElmerRenderOptions, TypeVirtualRenders } from "./IElmerRender";
import elmerRenderAction, { TypeElmerRenderDispatchNodes } from "./ElmerRenderAction";
import utils from "../lib/utils";

export class ElmerRender {
    private options: TypeElmerRenderOptions;
    private useComponents: any;
    private htmlCode: String;
    private virtualId: string;
    private srcVdom: IVirtualElement;
    private lastVirtualNode: IVirtualElement;

    private wikiNodes: TypeElmerRenderDispatchNodes[] = [];
    private virtualRenderObj: TypeVirtualRenders = {};

    @Autowired(RenderQueue)
    private renderQueue: RenderQueue;

    @Autowired(ElmerWorker)
    private worker: ElmerWorker;

    @Autowired(ElmerEvent)
    private eventObj: ElmerEvent;

    @Autowired(VirtualRender, VirtualNode)
    private virtualRender: VirtualRender;

    constructor(options: TypeElmerRenderOptions) {
        const importComponents = getComponents(options.ComponentFactory);
        this.options = options;
        this.useComponents = {
            ...options.useComponents,
            ...importComponents
        };
        (this.options.component as any).dom = {};
        this.virtualId = this.options.vdom.virtualID;
        elmerRenderAction.callLifeCycle(this.options.component as any, "$init");
        pluginExec<PluginRender>({
            name: "setComponents",
            token: [TOKEN_PLUGIN_RENDER],
            type: "NodeRender",
        }, this.useComponents);
        pluginExec<PluginRender>({
            name: "setSessionAction",
            token: [TOKEN_PLUGIN_RENDER],
            type: "NodeRender",
        },this.options.vdom.virtualID, {
            getComponentFirstElement: (virtualId: string): any => {
                if(this.virtualRenderObj[virtualId]) {
                    return (this.virtualRenderObj[virtualId] as ElmerRender).getFirstDom();
                }
            },
            getComponentLastElement: (virtualId: string): any => {
                if(this.virtualRenderObj[virtualId]) {
                    return (this.virtualRenderObj[virtualId] as ElmerRender).getLastDom();
                }
            }
        });
        this.eventObj.dispose();
    }
    async render(options: TypeRenderQueueOptions): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const eventOptions = {
                Component: this.options.ComponentFactory,
                componentObj: this.options.component,
                nodeData: this.options.vdom,
                props: (this.options.component as any).props,
                state: (this.options.component as any).state
            };
            this.renderQueue.startAction(this.options.vdom.virtualID, options, this.renderAction.bind(this), () => {
                if(options?.firstRender) {
                    elmerRenderAction.callLifeCycle(this.options.component, "$didMount", eventOptions);
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
                const errMsg = err.stack ? err.stack : (err.exception ? err.exception.stack : err.exception);
                // tslint:disable-next-line: no-console
                console.error(errMsg || err);
                reject(err);
            });
        });
    }
    /**
     * 获取最后一个渲染的真实元素
     */
    getLastDom(): HTMLElement | null | undefined {
        if (this.lastVirtualNode && this.lastVirtualNode.children) {
            for (let i = this.lastVirtualNode.children.length - 1; i >= 0; i--) {
                if (this.lastVirtualNode.children[i].status !== "DELETE") {
                    const lVdom = this.lastVirtualNode.children[i];
                    if (!utils.isEmpty(lVdom.virtualID)) {
                        if (this.virtualRenderObj[lVdom.virtualID]) {
                            return (this.virtualRenderObj[lVdom.virtualID] as ElmerRender).getLastDom();
                        }
                    } else {
                        return this.lastVirtualNode.children[i].dom as any;
                    }
                }
            }
        }
        return this.options.previousSibling;
    }
    /**
     * 获取第一个渲染到browser的元素
     */
    getFirstDom():HTMLElement|null|undefined {
        if(this.lastVirtualNode && this.lastVirtualNode.children) {
            for(let i=0;i<this.lastVirtualNode.children.length;i--) {
                if(this.lastVirtualNode.children[i].status !== "DELETE") {
                    const lVdom = this.lastVirtualNode.children[i];
                    if(!utils.isEmpty(lVdom.virtualID)) {
                        if(this.virtualRenderObj[lVdom.virtualID]) {
                            return (this.virtualRenderObj[lVdom.virtualID] as ElmerRender).getFirstDom();
                        }
                    } else {
                        return this.lastVirtualNode.children[i].dom as any;
                    }
                }
            }
        }
        return this.options.previousSibling;
    }
    destory(): void {
        // TODO: 需要在此处释放所有事件监听
        // 释放渲染插件调用对象
        pluginExec<PluginRender>({
            name: "destory",
            token: [ TOKEN_PLUGIN_RENDER ],
            type: "NodeRender"
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
                    fn: this.getSourceCode.bind(this)
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
            pluginExec<PluginRender>({
                name: "vdomRender",
                token: [ TOKEN_PLUGIN_RENDER ],
                type: "NodeRender",
                // tslint:disable-next-line: object-literal-sort-keys
                args: {
                    sessionId: this.options.vdom.virtualID
                }
            }, newDom.children, (vNode, isHtmlNode) => {
                pluginExec<PluginRender>({
                    name: "vdomAttatch",
                    token: [ TOKEN_PLUGIN_RENDER ],
                    type: "NodeRender",
                    // tslint:disable-next-line: object-literal-sort-keys
                    args: {
                        sessionId: this.options.vdom.virtualID
                    }
                }, {
                    container: this.options.container,
                    isHtmlNode,
                    sessionId: this.options.vdom.virtualID,
                    vdom: vNode,
                    vdomParent: newDom
                });
            }).then(() => {
                resolve({});
            }).catch((err) => {
                reject(err);
            });
            this.lastVirtualNode = newDom;
            console.log(this.options.container);
        });
    }
    private async getSourceCode():Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const com = (this.options.component as any);
            let vRender: Function;
            // render方法经过initializtion 方法初始化以后重写过此方法，返回的是一个Promise结果
            if(typeof com.$render === "function") {
                vRender = com.$render;
            } else {
                vRender = com.render;
            }
            queueCallFunc([
                {
                    id: "readSourceCode",
                    params: null,
                    // tslint:disable-next-line: object-literal-sort-keys
                    fn: vRender as any
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
