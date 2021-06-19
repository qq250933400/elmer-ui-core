// tslint:disable: ordered-imports
import { HtmlParse, IVirtualElement, VirtualNode, VirtualRender } from "elmer-virtual-dom";
import { queueCallFunc } from "elmer-common";
import { Component } from "../component";
import { getComponents } from "../decorators/loadComponents";
import { Autowired, Service } from "../decorators";
import { RenderQueue, TypeRenderQueueOptions } from "./RenderQueue";
import { ElmerWorker } from "elmer-worker";
import { EventInWorker } from "../events/EventInWorker";
import { getServiceObj } from "../decorators/Autowired";
import { ElmerEvent } from "../events/ElmerEvent";
import elmerRenderAction from "./ElmerRenderAction";
import utils from "../lib/utils";

type TypeElmerRenderOptions = {
    vdom: IVirtualElement;
    container: HTMLElement;
    component: Object;
    ComponentFactory: Component;
    children: IVirtualElement[];
    path: number[];
    useComponents: any;
};

export class ElmerRender {
    private options: TypeElmerRenderOptions;
    private useComponents: any;
    private htmlCode: String;
    private virtualId: string;
    private srcVdom: IVirtualElement;
    private oldDom: IVirtualElement;

    @Autowired(RenderQueue)
    private renderQueue: RenderQueue;

    @Autowired(ElmerWorker, {
        eventObj: getServiceObj(EventInWorker),
        htmlParse: getServiceObj(HtmlParse)
    })
    private worker: ElmerWorker;

    @Autowired(ElmerEvent, getServiceObj(ElmerWorker, {
        eventObj: getServiceObj(EventInWorker),
        htmlParse: getServiceObj(HtmlParse)
    }))
    private eventObj: ElmerEvent;

    @Autowired(VirtualNode)
    private virtualNode: VirtualNode;
    @Autowired(VirtualRender)
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
    destory(): void {
        console.log("release all elements");
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
            this.virtualRender.on(this.virtualId, "onDataBinding", (evt) => {
                console.log("----BindData---",evt);
            });
            const newDom = this.virtualRender.render(vdom, this.oldDom, this.options.component, {
                children: this.options.children,
                rootPath: this.options.path,
                sessionId: this.virtualId
            });
            console.log("---NewDom----", newDom);
            resolve({});
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
