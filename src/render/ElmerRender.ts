import { Common, queueCallFunc, TypeQueueCallParam } from "elmer-common";
import { IVirtualElement, VirtualNode, VirtualRender } from "elmer-virtual-dom";
import { ElmerWorker } from "elmer-worker";
import { Component, CONST_CLASS_COMPONENT_FLAG } from "../component/Component";
import { ContextStore } from "../context/contextStore";
import { globalVar } from "../core/globalState";
import { ElmerEvent } from "../events/ElmerEvent";
import { IElmerEvent } from "../events/IElmerEvent";
import { wikiState } from "../hooks/hookUtils";
import { autowired } from "../injectable";
// import { InjectComponent } from "../middleware/InjectComponent";
import { RenderMiddleware } from "../middleware/RenderMiddleware";
import { ElmerRenderAttrs, SVG_ELE, SVG_NL } from "./ElmerRenderAttrs";
import { RenderQueue, TypeRenderQueueOptions } from "./RenderQueue";

export type TypeUIRenderOptions = {
    isRSV?: boolean; // Render first init
    htmlCode?: string|IVirtualElement;
};

type TypeElmerRenderOptions = {
    component: Component;
    componentFactory?: Function;
    container: HTMLElement;
    contextStore: any;
    children?: IVirtualElement[];
    depth: number; // 当前节点深度
    renderOptions: TypeUIRenderOptions;
    userComponents?: Component[] | any;
    event: ElmerEvent;
    worker: ElmerWorker;
    missionId: string;
    nodePath: string;
    path: number[];
    prevDom?: HTMLElement;
    virtualId: string;
};
/**
 * 渲染虚拟dom事件参数
 */
type TypeVirtualDomRenderEvent = {
    container: HTMLElement;
    vdom: IVirtualElement;
    vdomParent: IVirtualElement;
    prevDom?:HTMLElement|Text|Comment;
    hasPathUpdate?: boolean;
    isTopLevel?: boolean;
};
/**
 * 渲染自定义组件事件参数
 */
type TypeComponentRenderEvent = {
    UserComponent: Function;
    container: HTMLElement;
    components: any; // 从上往下传引用的组件
    vdom: IVirtualElement;
    vdomParent: IVirtualElement;
    hasPathUpdate: boolean;
    prevDom: HTMLElement;
};

export class ElmerRender extends Common {

    @autowired(VirtualRender, "VirtualRender")
    private virtualRender: VirtualRender;
    @autowired(VirtualNode)
    private virtualElement: VirtualNode;
    @autowired(RenderQueue)
    private renderQueue: RenderQueue;
    // @autowired(InjectComponent)
    // private injectComponent: InjectComponent;
    @autowired(ElmerRenderAttrs)
    private renderDomAttrs: ElmerRenderAttrs;
    @autowired(RenderMiddleware)
    private renderMiddleware: RenderMiddleware;
    @autowired(ContextStore)
    private contextStore: ContextStore;

    private options: TypeElmerRenderOptions; // 当前render传入的参数
    private sourceDom: IVirtualElement; // 代码节点未渲染过的虚拟dom树
    private newDom: IVirtualElement; // 新节点渲染过的虚拟dom树
    private oldDom: IVirtualElement; // 旧dom节点
    private userComponents: any = {}; // 当前组件引用的自定义组件
    private eventObj: ElmerEvent; // 事件处理模块，全局只有一个对象，从最顶层往下传递
    private virtualId: string;
    private renderComponents: any = {}; // 当前组件下的自定义组件渲染对象
    private allInUseComponent: any = {}; // 当前组件所有用到的自定义组件对象
    constructor(options: TypeElmerRenderOptions) {
        super();
        let userComponents = (options.component as any).components || {};
        const fromParentComponents = options.userComponents || {};
        if(this.isArray(userComponents)) {
            // 此处转换为了兼容旧代码
            // 新版本将使用Object去掉Array的配置 {tagName:Component}, tagName在html代码中调用的标签名字，Component为自定义组件类
            const covertComponents = {};
            userComponents.map((componentConfig:any) => {
                covertComponents[componentConfig.selector] = componentConfig.component;
            });
            userComponents = covertComponents;
        }
        this.virtualRender.setVirtualElement(this.virtualElement);
        this.virtualId = options.virtualId || (this.guid() + "_" + (new Date()).getTime().toString()); // 当前自定义组件节点ID
        this.options = options;
        this.userComponents = {...userComponents, ...fromParentComponents};
        this.eventObj = options.event;
        this.options.component.setState = this.setComponentState.bind(this);
        this.options.component.setData = this.setComponentData.bind(this); // 当前方法由于需要遍历所有属性影响性能不建议使用，使用setState会更好，兼容旧代码
        this.options.component.dom = {};
        typeof this.options?.component?.$init === "function" && this.options?.component?.$init();
        this.options.component.$getComponents = () => this.userComponents;
    }
    /**
     * 获取最后一个渲染的真实元素
     */
    getLastDom():HTMLElement|null|undefined {
        if(this.newDom && this.newDom.children) {
            for(let i=this.newDom.children.length - 1;i>=0;i--) {
                if(this.newDom.children[i].status !== "DELETE") {
                    const lVdom = this.newDom.children[i];
                    if(!this.isEmpty(lVdom.virtualID)) {
                        if(this.renderComponents[lVdom.virtualID]) {
                            return (this.renderComponents[lVdom.virtualID] as ElmerRender).getLastDom();
                        } else {
                            return (this.renderComponents[lVdom.virtualID].dom) as any;
                        }
                    } else {
                        return this.newDom.children[i].dom as any;
                    }
                }
            }
        }
        return this.options.prevDom;
    }
    /**
     * 获取第一个渲染到browser的元素
     */
    getFirstDom():HTMLElement|null|undefined {
        if(this.newDom && this.newDom.children) {
            for(let i=0;i<this.newDom.children.length;i--) {
                if(this.newDom.children[i].status !== "DELETE") {
                    const lVdom = this.newDom.children[i];
                    if(!this.isEmpty(lVdom.virtualID)) {
                        if(this.renderComponents[lVdom.virtualID]) {
                            return (this.renderComponents[lVdom.virtualID] as ElmerRender).getFirstDom();
                        } else {
                            return (this.renderComponents[lVdom.virtualID].dom) as any;
                        }
                    } else {
                        return this.newDom.children[i].dom as any;
                    }
                }
            }
        }
        return this.options.prevDom;
    }
    destroy(): void {
        typeof this.options.component.$willMount === "function" && this.options.component.$willMount();
        this.renderMiddleware.destroy({
            Component: this.options.componentFactory,
            componentObj: this.options.component,
            nodeData: this.options.component.vdom,
            props: this.options.component.props
        });
        if(this.newDom) {
            this.newDom.children.map((itemDom:IVirtualElement) => {
                itemDom?.dom?.parentElement.removeChild(itemDom.dom);
            });
        }
        if(this.renderComponents) {
            Object.keys(this.renderComponents).map((virtualId: string) => {
                const vRender = <ElmerRender>this.renderComponents[virtualId];
                vRender.destroy();
                delete this.renderComponents[virtualId];
            });
        }
        // this.unbindAllEvents(true);
        this.newDom = null;
        this.oldDom = null;
    }
    async render(option: TypeRenderQueueOptions): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.renderMiddleware.beforeRender({
                Component: this.options.componentFactory,
                componentObj: this.options.component,
                nodeData: this.newDom,
                props: this.options.component.props
            });
            this.renderQueue.startAction(this.virtualId, option, this.renderAction.bind(this), () => {
                if(option.firstRender) {
                    this.renderMiddleware.didMount({
                        Component: this.options.componentFactory,
                        componentObj: this.options.component,
                        nodeData: this.options.component.vdom,
                        props: this.options.component.props
                    });
                    typeof this.options.component.$didMount === "function" && this.options.component.$didMount();
                } else {
                    this.renderMiddleware.afterRender({
                        Component: this.options.componentFactory,
                        componentObj: this.options.component,
                        nodeData: this.options.component.vdom,
                        props: this.options.component.props
                    });
                    typeof this.options.component.$didUpdate === "function" && this.options.component.$didUpdate();
                }
                resolve({});
            }).catch((err) => {
                // tslint:disable-next-line: no-console
                console.error(err.stack || err);
                if(option.firstRender) {
                    this.renderMiddleware.didMount({
                        Component: this.options.componentFactory,
                        componentObj: this.options.component,
                        nodeData: this.options.component.vdom,
                        props: this.options.component.props
                    });
                    typeof this.options.component.$didMount === "function" && this.options.component.$didMount();
                } else {
                    this.renderMiddleware.afterRender({
                        Component: this.options.componentFactory,
                        componentObj: this.options.component,
                        nodeData: this.options.component.vdom,
                        props: this.options.component.props
                    });
                    typeof this.options.component.$didUpdate === "function" && this.options.component.$didUpdate();
                }
                reject(err);
            });
        });
    }
    private async getSourceCode():Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let vdom:IVirtualElement;
            if(typeof this.options.component.$render === "function") {
                vdom = (this.options.component.$render as any)(this.options.component.props);
            } else if(typeof this.options.component["render"] === "function") {
                vdom = (this.options.component["render"] as any)(this.options.component.props);
            } else {
                vdom = this.options.component["templateCode"];
            }
            if(this.isString(vdom)) {
                // vdom = this.htmlParse.parse(vdom);
                this.options.worker.callObjMethod("htmlParse","parse", vdom as any)
                    .then((resp) => {
                        resolve(resp.data);
                    }).catch((err) => {
                        reject(err);
                    });
            } else {
                resolve(vdom);
            }
        });
    }
    private async renderAction(options:TypeRenderQueueOptions):Promise<any> {
        return new Promise<any>((resolve, reject) => {
            try {
                typeof this.options.component.$before === "function" && typeof this.options.component.$before();
                this.getSourceCode().then((vdom) => {
                    let isVirtualRenderResult: boolean;
                    this.oldDom = this.newDom;
                    this.sourceDom = vdom;
                    if(options.state) {
                        this.extend(this.options.component.state, options.state);
                    }
                    if(options.data) {
                        this.extend(this.options.component, options.data);
                    }
                    // 准备渲染虚拟dom，做数据绑定和diff运算
                    const destoryOnBeforeVirtualRender = this.virtualRender.bind(this.virtualId, "onBeforeRender", (opt) => {
                        if(typeof this.options.component.$beforeVirtualRender === "function") {
                            isVirtualRenderResult = this.options.component.$beforeVirtualRender(opt.data);
                        }
                    });
                    if(isVirtualRenderResult !== undefined && isVirtualRenderResult !== null && !isVirtualRenderResult) {
                        // 人为手动干预渲染动态
                        resolve({});
                        return;
                    }
                    const destoryOnVirtualRender = this.virtualRender.bind(this.virtualId, "onRender", (opt) => {
                        const vituralDom: IVirtualElement = opt.data.dom;
                        const isComponentChild = opt.data.isComponentChild;
                        let isUserComponent = false;
                        const elmerData = globalVar();
                        const components = elmerData.components || {};
                        const UserComponent = this.userComponents[vituralDom.tagName] || components[vituralDom.tagName];
                        if(typeof UserComponent === "function") {
                            const key = vituralDom.path.join("-");
                            this.allInUseComponent[key] = {
                                component: UserComponent,
                                selector: vituralDom.tagName
                            };
                            isUserComponent = true;
                        }
                        if(isComponentChild) {
                            if(!(vituralDom as any).component) {
                                (vituralDom as any).component = this.options.component;
                            }
                        }
                        return {
                            isComponent: isUserComponent,
                            isComponentChild
                        };
                    });
                    const renderDom = this.virtualRender.render(this.sourceDom, this.oldDom, this.options.component, {
                        children: this.options.children,
                        rootPath: [], // this.options.path,
                        sessionId: this.virtualId
                    });
                    // this.virtualRender.unBind(this.virtualId, "onBeforeRender", renderEventId); // render 结束移除监听事件
                    typeof this.options.component.$afterVirtualRender === "function" && this.options.component.$afterVirtualRender(renderDom);
                    if(typeof this.options.component.$beforeRender === "function") {
                        isVirtualRenderResult = this.options.component.$beforeRender(renderDom);
                    }
                    if(isVirtualRenderResult !== undefined && isVirtualRenderResult !== null && !isVirtualRenderResult) {
                        // 人为手动干预渲染动态
                        resolve({});
                        return;
                    }
                    // 准备渲染数据
                    const renderParams: TypeQueueCallParam[] = [];
                    let hasPathUpdate = false;
                    renderDom.children.map((dom:IVirtualElement, index:number) => {
                        if(dom.status === "DELETE" || dom.status === "APPEND" || dom.status === "MOVE" || dom.status === "MOVEUPDATE") {
                            hasPathUpdate = true;
                        }
                        renderParams.push({
                            id: "virtualRender_" + index,
                            params: {
                                parent: this.options.container,
                                vdom:dom,
                                vdomParent: renderDom
                            }
                        });
                    });
                    if(!hasPathUpdate) {
                        hasPathUpdate = renderDom.deleteElements && renderDom.deleteElements.length > 0;
                    }
                    this.deleteVDomOutOfLogic(renderDom.deleteElements); // 删除dom diff算法计算出需要手动删除的节点
                    queueCallFunc(renderParams, (option, params):any => {
                        let prevDom:any = option.lastResult ? option.lastResult.prevDom : null;
                        if(option.id === "virtualRender_0") {
                            prevDom = <any>this.options.prevDom;
                        }
                        return this.renderVirtualDom({
                            container: params.parent,
                            hasPathUpdate,
                            isTopLevel: true,
                            prevDom,
                            vdom: params.vdom,
                            vdomParent: params.vdomParent
                        });
                    }, {
                        throwException: true
                    }).then(() => {
                        destoryOnBeforeVirtualRender();
                        destoryOnVirtualRender();
                        resolve({});
                    }).catch((err) => {
                        const statusCode = this.getValue(err, "exception.statusCode");
                        destoryOnBeforeVirtualRender();
                        destoryOnVirtualRender();
                        if(!this.isEmpty(statusCode)) {
                            const newErr = err.exception;
                            // tslint:disable-next-line: no-console
                            console.error(newErr?.exception?.stack);
                            reject({
                                ...err.exception,
                                stack: newErr?.exception?.stack,
                            });
                        } else {
                            reject({
                                message: err.message,
                                stack: err?.exception?.stack,
                                statusCode: err.statusCode
                            });
                        }
                    });
                    this.newDom = renderDom; // 渲染结束更新节点到对应的属性
                    this.options.component.vdom = renderDom;
                }).catch((err) => {
                    // tslint:disable-next-line: no-console
                    reject(err);
                });
            } catch(e) {
                // tslint:disable-next-line: no-console
                reject({
                    message: e.message,
                    statusCode: "T_500"
                });
            }
        });
    }
    private async setComponentState(state:any, force?: boolean): Promise<any> {
        return new Promise((resolve, reject) => {
            if(this.isObject(state)) {
                const component = this.options.component;
                const stateKeys = Object.keys(state);
                let dataChanged = force;
                if(component.state) {
                    for(const sKey of stateKeys) {
                        if(this.isObject(state[sKey]) && this.isObject(component.state[sKey])) {
                            if(!this.isEqual(state[sKey], component.state[sKey])) {
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
                        ...(this.options.component.state || {}),
                        ...state
                    };
                    delete this.options.component.state;
                    this.options.component.state = newState;
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
    /**
     * 对比当前组件所有属性, 当前方法不建议使用
     * @deprecated
     * @param data 对比数据
     * @param fn 重新渲染结束回调
     */
    private async setComponentData(data:any, ignoreWarn?: boolean): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            // tslint:disable-next-line: no-console
            !ignoreWarn && console.warn("The SetData method is not recommended. Use setState instead。");
            if(this.isObject(data)) {
                const component = this.options.component;
                const dataKeys = Object.keys(data);
                let dataChanged = false;
                for(const sKey of dataKeys) {
                    if(this.isObject(data[sKey]) && this.isObject(component[sKey])) {
                        if(!this.isEqual(data[sKey], component[sKey])) {
                            dataChanged = true;
                            break;
                        }
                    } else {
                        if(data[sKey] !== component[sKey]) {
                            dataChanged = true;
                            break;
                        }
                    }
                }
                if(dataChanged) {
                    this.extend(this.options.component, data);
                    this.render({
                        data,
                        firstRender: false
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
    private renderVirtualDom(options: TypeVirtualDomRenderEvent): Promise<any> {
        const container:HTMLElement = options.container,
            vdom: IVirtualElement = options.vdom,
            vdomParent: IVirtualElement = options.vdomParent,
            prevDom:HTMLElement|Text|Comment = options.prevDom;
        return new Promise<any>((resolve, reject) => {
            try {
                const elmerData = globalVar();
                const components = elmerData.components || {};
                vdom.isDiff = false;
                if(this.isEmpty(vdom.tagName)) {
                    reject({
                        message: "virtual dom node is not correct, missing tagName attribute",
                        statusCode: "VR_404",
                        vdom
                    });
                } else {
                    const UserComponent = this.userComponents[vdom.tagName] || components[vdom.tagName];
                    if(typeof UserComponent === "function") {
                        this.renderUserComponent({
                            UserComponent,
                            components: this.userComponents,
                            container,
                            hasPathUpdate: options.hasPathUpdate,
                            prevDom: prevDom as any,
                            vdom,
                            vdomParent
                        }).then(() => {
                            const virtualPrevDom = this.getPrevDomByVirtualNode(vdom);
                            // 当前节点为最顶层节点时，获取不到上一个节点的真实节点时可以使用上一层自定义组件传递过来的值
                            // 防止第一个节点if === false, 时无法取到邻近的节点导致位置错误
                            resolve({
                                prevDom: !virtualPrevDom && options.isTopLevel ? this.options.prevDom : virtualPrevDom
                            });
                        }).catch((err) => {
                            reject({
                                message: err.message,
                                stack: this.isObject(err.exception) ? err.exception.stack : err.stack,
                                statusCode: err.statusCode
                            });
                        });
                    } else {
                        // 渲染浏览器标准元素
                        // vdom.status === "NORMAL"  不需要做任何操作
                        let hasPathChange = vdom.deleteElements && vdom.deleteElements.length > 0;
                        const isSVG = vdom.tagAttrs?.isSVG || vdom.tagName.toLowerCase() === "svg";
                        if(!vdom.tagAttrs) {
                            vdom.tagAttrs = {};
                        }
                        vdom.tagAttrs.isSVG = isSVG;
                        if(vdom.status === "APPEND") {
                            // 新增元素
                            this.vdomAppendRender(container,vdom,vdomParent, prevDom as any);
                            hasPathChange = true;
                        } else if(vdom.status === "UPDATE") {
                            if(this.isDOM(vdom.dom) || this.isTextNode(vdom.dom)) {
                                this.renderDomAttrs.render(vdom.dom as any, vdom);
                            } else {
                                // vdom.dom对象为undefined或null即为不存在对应的真实dom节点，需要新增
                                !vdom.dom && this.vdomAppendRender(container, vdom, vdomParent, prevDom as any);
                            }
                        } else if(vdom.status === "MOVE") {
                            this.vdomMove(container, vdom, vdomParent);
                            hasPathChange = true;
                        } else if(vdom.status === "MOVEUPDATE") {
                            hasPathChange = true;
                            if(this.isDOM(vdom.dom) || this.isTextNode(vdom.dom)) {
                                this.vdomMove(container, vdom, vdomParent);
                                this.renderDomAttrs.render(vdom.dom as HTMLElement, vdom);
                            } else {
                                !vdom.dom && this.vdomAppendRender(container, vdom, vdomParent, prevDom as any);
                            }
                        } else if(vdom.status === "NORMAL") {
                            if(!vdom.dom) {
                                this.vdomAppendRender(container, vdom, vdomParent, prevDom as any);
                            }
                        } else if(vdom.status === "DELETE") {
                            hasPathChange = true;
                        }
                        if(!hasPathChange) {
                            hasPathChange = options.hasPathUpdate;
                        }
                        if(vdom.status !== "DELETE") {
                            (vdom.dom as any).path = vdom.path;
                            (vdom.dom as any).vNodePath = this.options.nodePath;
                            if(!this.isEmpty(vdom.props.id)) {
                                this.options.component.dom[vdom.props.id] = vdom.dom;
                            }
                            this.subscribeEvents(vdom);
                            // this.subscribeEventAction(vdom);
                            if(vdom.dataSet && vdom.dataSet.type === "html") {
                                (vdom.dom as HTMLElement).innerHTML = vdom.innerHTML;
                                resolve({
                                    prevDom: vdom.dom
                                });
                            } else {
                                if(vdom.children && vdom.children.length > 0) {
                                    // 当status为delete时删除父节点并移除事件监听就行，不需要在对子节点循环删除
                                    const renderParams: TypeQueueCallParam[] = [];
                                    vdom.children.map((childDom:IVirtualElement, index:number) => {
                                        if(isSVG) {
                                            if(!childDom.tagAttrs) {
                                                childDom.tagAttrs = {};
                                            }
                                            childDom.tagAttrs.isSVG = true;
                                        }
                                        renderParams.push({
                                            id: "virtualRender_" + index,
                                            params: {
                                                parent: vdom.dom,
                                                vdom: childDom,
                                                vdomParent: vdom
                                            }
                                        });
                                    });
                                    queueCallFunc(renderParams, ({}, params):any => {
                                        return this.renderVirtualDom({
                                            container: params.parent,
                                            hasPathUpdate: hasPathChange,
                                            vdom: params.vdom,
                                            vdomParent: params.vdomParent as any
                                        });
                                    }, {
                                        throwException: true
                                    }).then(() => {
                                        resolve({
                                            hasPathUpdate: hasPathChange,
                                            prevDom: vdom.dom
                                        });
                                    }).catch((err) => {
                                        const lightStack = this.isObject(err.exception) ? err.exception.stack : err.stack;
                                        const finalStack = err.exception?.exception?.stack || lightStack;
                                        reject({
                                            message: err.message,
                                            stack: finalStack,
                                            statusCode: err.statusCode
                                        });
                                    });
                                } else {
                                    resolve({
                                        hasPathUpdate: hasPathChange,
                                        prevDom: vdom.dom
                                    });
                                }
                            }
                        } else {
                            // 节点是删除状态时，当前循环到此结束, 删除所有子节点
                            // 当节点被标记为删除时，移除dom元素，并销毁事件监听和虚拟dom对象
                            // todo release all user defined component
                            // 删除事件监听已经在渲染前做删除，不需要在此处做操作
                            // 当前节点被删除，下一个节点的邻近节点需要往前查找，找不到使用父组件传递过来的节点，否则会以append的方式添加到容易最后一个节点
                            const getPrevDom = this.getPrevDom(vdom, vdomParent)?.dom;
                            this.deleteVirtualDom(vdom);
                            resolve({
                                hasPathUpdate: hasPathChange,
                                prevDom: !getPrevDom && options.isTopLevel ? this.options.prevDom : null
                            });
                        }
                    }
                    // 删除不必要的元素，非异步过程不需要等待返回
                    this.deleteVDomOutOfLogic(vdom.deleteElements);
                }
            } catch (e) {
                reject({
                    exception: e,
                    message: e.message,
                    statusCode: "RT_500"
                });
            }
        });
    }
    private getUseComponents(vdom: IVirtualElement, props: any): any {
        if(props["__cfp__"]) {
            return this.userComponents;
        } else {
            const extendComponents = {};
            const currentPathKey = vdom.path.join("-");
            Object.keys(this.allInUseComponent).map((key: string) => {
                if(currentPathKey === key.substr(0, currentPathKey.length)) {
                    const com = this.allInUseComponent[key];
                    extendComponents[com.selector] = com.component;
                }
            });
            return extendComponents;
        }
    }
    private renderUserComponent(options: TypeComponentRenderEvent):Promise<any> {
        const UserComponent: any = options.UserComponent,
            container:HTMLElement = options.container,
            vdom: IVirtualElement = options.vdom,
            vdomParent: IVirtualElement = options.vdomParent;
        return new Promise<any>((resolve, reject) => {
            const prevDom = this.getPrevDom(vdom, vdomParent);
            const middlewareObj = this.renderMiddleware;
            const doUpdateAction = (vRender:ElmerRender, vRDom: IVirtualElement, doUpdatePrevDom:HTMLElement, needRender: boolean):Promise<any> => {
                return new Promise<any>((resolveFn, rejectFn) => {
                    const props = {
                        children: vRDom.children
                    };
                    vRender.options.prevDom = doUpdatePrevDom;
                    this.extend(props, vRender.options.component.props, true);
                    this.extend(props, vRDom.changeAttrs, true);
                    middlewareObj.beforeUpdate({
                        Component: UserComponent,
                        componentObj: vRender.options.component,
                        nodeData: vdom,
                        props
                    });
                    vRender.options.children = vRDom.children; // 替换子元素为最新的元素，以便子元素做diff运算
                    if(!(vRender as any).isClassComponent) {
                        vRender.options.component.props = props;
                        vRender.render({
                            firstRender: false
                        }).then(() => resolve({})).catch((err) => rejectFn(err));
                    } else {
                        const willReceviePropsFn = this.getValue(vRender.options.component, "__proto__.constructor.$willReceiveProps");
                        if(!this.isEqual(props, vRender.options.component.props) && typeof willReceviePropsFn === "function") {
                            const returnState = willReceviePropsFn(props, vRender.options.component.state);
                            let hasStateChange = false;
                            if(returnState) {
                                // 判断返回的state是否有变化，只有返回的state和旧state对象上的值不一样时才做渲染动作
                                // tslint:disable-next-line: forin
                                for(const key in returnState) {
                                    const oldState = this.getValue(vRender.options.component.state, key);
                                    if(!this.isEqual(returnState[key], oldState)) {
                                        hasStateChange = true;
                                        break;
                                    }
                                }
                            }
                            // 不管最终是否需要重新渲染都必须更新props到最新的值, 否则会引发很难检测的问题
                            vRender.options.component.props = props;
                            if(hasStateChange || needRender) {
                                // 当willReceiveProps返回数据以后调用setState方法执行更新操作
                                // 调用setState方法重新渲染
                                // 当子元素需要更新时也执行更新操作
                                vRender.options.component.state = {
                                    ...(vRender.options.component.state || {}),
                                    ...(returnState || {})
                                };
                                vRender.render({
                                    firstRender: false
                                }).finally(() => resolveFn({}));
                            } else {
                                resolveFn({});
                            }
                        } else {
                            !needRender && resolveFn({});
                            needRender && vRender.render({firstRender: false}).finally(() => resolveFn({}));
                        }
                    }
                });
            };
            vdom.tagAttrs = {
                isComponent: true
            };
            if(vdom.status === "APPEND") {
                const flag = (<any>UserComponent).flag;
                const props = {
                    ...vdom.props,
                    children: vdom.children
                };
                middlewareObj.beforeInit({
                    Component: UserComponent,
                    componentObj: null,
                    nodeData: vdom,
                    props
                });
                const virtualId = "vNode_" + vdom.tagName + "_" + this.guid().replace(/\-/g, "");
                const missionId = this.options.missionId;
                const hookStore = {
                    getNode: {},
                    useCallback: {},
                    useComponent: {},
                    useEffect: {},
                    useState: {}
                };
                const extendComponents = this.getUseComponents(vdom, props); // 获取当前使用的自定义组件
                let component;
                let isClassComponent = false;
                if(flag === CONST_CLASS_COMPONENT_FLAG) {
                    // 类组件
                    component = new UserComponent(props, this.contextStore.getContext(this.options.contextStore.stores));
                    isClassComponent = true;
                } else {
                    // 高阶组件，即是一个函数的静态组件
                    component = {
                        dom: {},
                        props,
                        selector: vdom.tagName,
                        // tslint:disable-next-line: object-literal-sort-keys
                        __factory: UserComponent,
                        $getContext: UserComponent.$getContext,
                        // tslint:disable-next-line: object-literal-shorthand
                        render: function():any {
                            wikiState[missionId] = {
                                _component: UserComponent,
                                _renderObj: vRender,
                                _this: this,
                                getNodeIndex: 0,
                                hookStore,
                                useCallbackIndex: 0,
                                useComponentIndex: 0,
                                useEffectIndex: 0,
                                useStateIndex: 0
                            };
                            wikiState["missionId"] = missionId;
                            const contextState = vRender.contextStore.getContext(vRender.options.contextStore.stores);
                            this.context = contextState;
                            return this["__factory"].call(this, vRender.options.component.props, contextState);
                        },
                        $willReceiveProps(newProps: any): void {
                            (this as any).props = newProps;
                            middlewareObj.willReceiveProps({
                                Component: UserComponent,
                                componentObj: this,
                                nodeData: vdom,
                                props: newProps
                            });
                        }
                    };
                }
                const allContextStore = this.options.contextStore.stores || {};
                let contextParentPath = this.options.contextStore.parentPath;
                if(typeof component.$getContext === "function") {
                    // 定义context
                    const definedContextState = typeof component.$getContext === "function" ? component.$getContext.call(component, {
                        path: vdom.path,
                        props
                    }) : null;
                    if(definedContextState) {
                        const defineStoreId = vdom.tagName + "_" + virtualId;
                        const definedContextStore = this.contextStore.createStore({
                            component,
                            initState: definedContextState,
                            nodeId: defineStoreId,
                            path: contextParentPath
                        });
                        allContextStore[defineStoreId] = definedContextStore;
                        contextParentPath = definedContextStore.nodeId;
                    } else {
                        throw new Error(`The $getcontext method must return an object object.(${vdom.tagName})`);
                    }
                }
                const vRender = new ElmerRender({
                    children: vdom.children,
                    component,
                    componentFactory: UserComponent,
                    container,
                    contextStore: {
                        parentPath: contextParentPath,
                        stores: allContextStore
                    },
                    depth: this.options.depth + 1,
                    event: this.eventObj,
                    missionId: this.options.missionId,
                    nodePath: this.isEmpty(this.options.nodePath) ? virtualId : this.options.nodePath + "." + virtualId,
                    path: [...this.options.path, ...vdom.path],
                    prevDom: this.getPrevDomByVirtualNode(prevDom) as HTMLElement || options.prevDom,
                    renderOptions: this.options.renderOptions,
                    userComponents: extendComponents, // options.components,
                    virtualId,
                    worker: this.options.worker
                });
                (vRender as any).isClassComponent = isClassComponent;
                vdom.virtualID = virtualId;
                // this.injectComponent.initComponent(component, UserComponent, vdom);
                this.renderComponents[virtualId] = vRender;
                middlewareObj.init({
                    Component: UserComponent,
                    componentObj: component,
                    nodeData: vdom,
                    props
                });
                if(!this.isEmpty(props.id)) {
                    this.options.component.dom[props.id] = component;
                }
                if(typeof component.$resize === "function") {
                    vdom.events = {
                        resize: component.$resize.bind(component)
                    };
                    this.subscribeEvents(vdom);
                }
                // ---- some thing is doing in init
                vRender.render({
                    firstRender: true
                }).then(() => {
                    resolve({});
                }).catch((err) => {
                    reject(err);
                });
                if(!this.isEmpty(vdom.props.id)) {
                    this.options.component.dom[vdom.props.id] = component;
                }
            } else if(vdom.status === "UPDATE") {
                const vRender:ElmerRender = this.renderComponents[vdom.virtualID];
                if(vRender) {
                    const rPrevDom = prevDom ? prevDom.dom as any : null;
                    doUpdateAction(vRender, vdom, rPrevDom, this.checkVirtualNodeChange(vdom))
                        .then(() => resolve({}))
                        .catch((err) => reject(err));
                    // 预留执行其他方法
                } else {
                    resolve({});
                }
            } else if(vdom.status === "MOVE") {
                this.moveComponentPosition(container ,vdom, vdomParent);
                const vRender:ElmerRender = this.renderComponents[vdom.virtualID];
                const rPrevDom = prevDom ? prevDom.dom as any : null;
                // 如果子节点有变化，先执行render方法往下执行渲染
                // 由于触发willReciveProps方法未必会执行渲染动作，所以先执行子节点的渲染在触发willReciveProps事件
                doUpdateAction(vRender, vdom, rPrevDom, this.checkVirtualNodeChange(vdom))
                    .then(() => resolve({}))
                    .catch((err) => reject(err));
            } else if(vdom.status === "MOVEUPDATE") {
                this.moveComponentPosition(container, vdom, vdomParent);
                const vRender:ElmerRender = this.renderComponents[vdom.virtualID];
                if(vRender) {
                    const rPrevDom = prevDom ? prevDom.dom as any : null;
                    doUpdateAction(vRender, vdom, rPrevDom, this.checkVirtualNodeChange(vdom))
                        .then(() => resolve({}))
                        .catch((err) => reject(err));
                } else {
                    resolve({});
                }
            } else if(vdom.status === "DELETE") {
                const vRender:ElmerRender = this.renderComponents[vdom.virtualID];
                vRender && vRender.destroy();
                delete this.renderComponents[vdom.virtualID];
                if(!this.isEmpty(vdom.props.id)) {
                    delete this.options.component.dom[vdom.props.id];
                }
                resolve({});
            } else {
                if(this.checkVirtualNodeChange(vdom)) {
                    const vRender:ElmerRender = this.renderComponents[vdom.virtualID];
                    vRender.options.children = vdom.children;
                    vRender.render({
                        firstRender: false
                    }).finally(() => {
                        resolve({});
                    });
                } else {
                    resolve({});
                }
            }
        });
    }
    /**
     * 只使用与自定义组件包含子组件时的判断
     * 只要有任何一个子组件的status不是NORMAL的时候则认为需要重新做渲染动作
     * @param vdom - 要判断的虚拟节点
     * @returns 是否需要重新渲染
     */
    private checkVirtualNodeChange(vdom:IVirtualElement): boolean|null {
        if(vdom.status !== "NORMAL") {
            return true;
        } else {
            if(vdom.children && vdom.children.length > 0) {
                for(const item of vdom.children) {
                    if(this.checkVirtualNodeChange(item)) {
                        return true;
                    }
                }
            }
        }
    }
    /**
     * 新节点位置变化，需要做移动操作
     * @param container
     * @param vdom
     * @param vdomParent
     */
    private vdomMove(container:HTMLElement, vdom:IVirtualElement, vdomParent:IVirtualElement): void {
        const index = vdom.path[vdom.path.length - 1];
        const prevIndex = index - 1;
        const prevDom = vdomParent.children[prevIndex];
        if(prevDom) {
            const domNext = prevDom.dom.nextElementSibling;
            if(domNext) {
                container.insertBefore(vdom.dom, domNext);
            } else {
                container.appendChild(vdom.dom);
            }
        } else {
            // 未找到上一个节点，则任务当前节点为第一个节点
            if(container.children.length > 0) {
                container.insertBefore(vdom.dom, container.children[0]);
            } else {
                container.appendChild(vdom.dom);
            }
        }
        (vdom.dom as any).path = vdom.path;
    }
    private createDomByVdom(vdom:IVirtualElement): HTMLElement|Text|Comment {
        if(vdom.tagName === "text") {
            return document.createTextNode(vdom.innerHTML);
        } else if(/^<\!--$/.test(vdom.tagName)) {
            return document.createComment(vdom.innerHTML);
        } else {
            if(vdom.tagAttrs?.isSVG && SVG_ELE.indexOf(vdom.tagName.toLowerCase())>=0) {
                const xmlns = !this.isEmpty(vdom.props.xmlns) ? vdom.props.xmlns : SVG_NL;
                return document.createElementNS(xmlns, vdom.tagName);
            } else {
                return document.createElement(vdom.tagName);
            }
        }
    }
    private vdomAppendRender(container:HTMLElement,vdom:IVirtualElement, vdomParent:IVirtualElement, prevSlideDom?: HTMLElement|Text): void {
        const prevDom = this.getPrevDom(vdom, vdomParent);
        const newDom = this.createDomByVdom(vdom);
        (newDom as any).virtualId = this.virtualId; // 给所有需要做事件绑定元素绑定当前层级上虚拟节点id，用于区分不同的节点
        if(prevDom) {
            // 查找到前一个节点，需要插入到前一个节点后面，紧跟着上一个节点，防止节点位置错误
            let prevDomElement = prevDom.dom;
            if(prevDom?.tagAttrs?.isComponent || !this.isEmpty(vdom.virtualID)) {
                // 当前组件为自定义组件，需要到virtualComponent查询相近的元素
                // 防止拿到错误的元素
                const vRender = <ElmerRender>this.renderComponents[prevDom.virtualID];
                prevDomElement = vRender.getLastDom();
            }
            if(prevDomElement) {
                const domNext = prevDomElement.nextElementSibling;
                if(domNext) {
                    container.insertBefore(newDom, domNext);
                } else {
                    container.appendChild(newDom);
                }
            } else {
                // 上一个节点的真实节点不存在时，插入到最前面
                // 一般这种情况是不会出现的，出现这种情况证明渲染逻辑已经出现问题
                if(container.children.length > 0) {
                    container.insertBefore(newDom, container.children[0]);
                } else {
                    container.appendChild(newDom);
                }
            }
        } else {
            if(!prevSlideDom) {
                // 针对第一层节点的渲染
                // 查找不到上一个节点，说明当前节点需要插入到第一个位置
                if(container.children.length > 0) {
                    container.insertBefore(newDom, container.children[0]);
                } else {
                    container.appendChild(newDom);
                }
            } else {
                // 针对第一层节点的渲染, 第一层会渲染拿从上一节点传进来的参考元素
                const nextSlideDom = prevSlideDom.nextElementSibling;
                if(nextSlideDom) {
                    container.insertBefore(newDom, nextSlideDom);
                } else {
                    container.appendChild(newDom);
                }
            }
        }
        if(!/^<\!--$/.test(vdom.tagName) && !/^text$/.test(vdom.tagName)) {
            // 文本节点不需要做事件绑定和属性渲染
            this.renderDomAttrs.render(newDom as HTMLElement, vdom);
        }
        vdom.dom = newDom;
    }
    private subscribeEvents(vdom:IVirtualElement): void {
        const allEvents = vdom.events || {};
        const eventKeys = Object.keys(allEvents);
        if(allEvents && eventKeys.length > 0) {
            Object.keys(allEvents).map((eventName: string): void => {
                typeof allEvents[eventName] === "function" && this.eventObj.subscribe(vdom.dom as any, {
                    callback: ((obj: any, callback: Function) => {
                        return (event:any) => {
                            return callback.call(obj, event);
                        };
                    })(this.options.component, allEvents[eventName]),
                    depth: this.options.depth,
                    eventHandler: (allEvents[eventName] as Function).bind(this),
                    eventName,
                    path: [...this.options.path, ...vdom.path],
                    virtualId: this.options.virtualId,
                    virtualNodePath: this.options.path,
                    virtualPath: this.options.nodePath
                });
            });
        }
    }
    private getPrevDom(vdom:IVirtualElement, vdomParent:IVirtualElement): IVirtualElement|null {
        const index = vdom.path[vdom.path.length - 1];
        const prevIndex = index - 1;
        const prevDom = vdomParent.children[prevIndex];
        if(prevDom) {
            if(prevDom.status !== "DELETE") {
                return prevDom;
            } else {
                return this.getPrevDom(prevDom, vdomParent);
            }
        }
    }
    private getNextDom(vdom:IVirtualElement, vdomParent:IVirtualElement): IVirtualElement|null {
        const index = vdom.path[vdom.path.length - 1];
        const nextIndex = index + 1;
        const nextDom = vdomParent.children[nextIndex];
        if(nextDom) {
            if(nextDom.status !== "DELETE") {
                return nextDom;
            } else {
                return this.getNextDom(nextDom, vdomParent);
            }
        }
    }
    /**
     * 遇到需要删除的节点时，释放所有子节点数据
     * @param vdom
     */
    private deleteVirtualDom(vdom:IVirtualElement, isDeepDelete?: boolean): void {
        if(vdom?.tagAttrs?.isComponent) {
            if(this.renderComponents[vdom.virtualID]) {
                (this.renderComponents[vdom.virtualID] as ElmerRender).destroy();
                delete this.renderComponents[vdom.virtualID];
            }
        } else {
            if(vdom.dom && !isDeepDelete) {
                vdom.dom.parentElement && vdom.dom.parentElement.removeChild(vdom.dom);
                vdom.dom = null;
            }
        }
        vdom.status === "DELETE";
        vdom.dom = null;
        vdom.events = null;
        vdom.props = {};
        if(vdom.children && vdom.children.length > 0) {
            vdom.children.map((vdomChild) => {
                this.deleteVirtualDom(vdomChild, true);
            });
        }
    }
    /**
     * 删除通过diff运算检测出在旧dom树存在节点，但是在新dom树没有出现节点的元素
     * 这种元素在新dom树无法标记，所以需要手动删除
     * @param deleteVdoms
     */
    private deleteVDomOutOfLogic(deleteVdoms: IVirtualElement[], isDeepDelete?: boolean ): void {
        if(deleteVdoms && deleteVdoms.length > 0) {
            for(const delDom of deleteVdoms) {
                if(!this.isEmpty(delDom.props.id)) {
                    delete this.options.component.props[delDom.props.id];
                }
                if(delDom?.tagAttrs?.isComponent) {
                    const dRender = <ElmerRender>this.renderComponents[delDom.virtualID];
                    dRender && dRender.destroy();
                    delete this.renderComponents[delDom.virtualID];
                } else {
                    if(delDom.dom && !isDeepDelete) {
                        delDom.dom.parentElement && delDom.dom.parentElement.removeChild(delDom.dom);
                        // 每次渲染前都会将事件监听清除，重新挂载新的事件监听, 不需要每次都做判断
                        // 此操作对渲染功能影响是否需要在做处理，留到后续版本做更新
                        // todo: Release event listener
                    }
                }
                delDom.children && delDom.children.length > 0 && this.deleteVDomOutOfLogic(delDom.children, true);
            }
        }
    }
    /**
     * 自定义组件位置发生变化，需要根据实际dom树移动，不需要删除在重新创建
     * @param vdom 当前虚拟dom节点
     * @param vdomParent 当前虚拟dom节点的父节点
     */
    private moveComponentPosition(container: HTMLElement,vdom:IVirtualElement, vdomParent: IVirtualElement): void {
        // 位置发生变化时，只有往后查找渲染的节点，因为只有通过insertBefore这个方法才可以移动节点
        // 如果是往前查找，找到前一个节点时需要找下一个节点才能调用insertBefore这时候会陷入死循环
        const vRender = <ElmerRender>this.renderComponents[vdom.virtualID];
        const nextDom = this.getNextDom(vdom, vdomParent);
        let nextSlideDom = nextDom.dom;
        if(nextDom?.tagAttrs?.isComponent || !this.isEmpty(nextDom.virtualID)) {
            nextSlideDom = (<ElmerRender>this.renderComponents[nextDom.virtualID])?.getFirstDom();
        }
        if(nextSlideDom) {
            const moveMaxIndex = vRender.newDom.children.length;
            let moveIndex = moveMaxIndex - 1;
            // 由于移动使用insertBefore方法，所以nextSlideDom是当前component的下一个元素
            // 所以应该是从最后的元素开始移动
            while(moveIndex >= 0) {
                const moveDom = vRender.newDom.children[moveIndex];
                if(moveDom.status !== "DELETE") {
                    container.insertBefore(moveDom.dom, nextSlideDom);
                    nextSlideDom = moveDom.dom; // 下一个元素应该是当前元素
                }
                moveIndex -= 1;
            }
        } else {
            // 通过diff运算检测出当前元素需要移动，但是处于当前同级dom列表中的最后一个，往后追加即可
            vRender.newDom.children.map((moveItem:IVirtualElement) => {
                if(moveItem.status !== "DELETE") {
                    // status为DELETE状态的虚拟dom是没有真实dom节点可以操作的
                    container.appendChild(moveItem.dom);
                }
            });
        }
    }
    private getPrevDomByVirtualNode(vdom:IVirtualElement): HTMLElement|Element|SVGElement|Text|Comment {
        if(vdom) {
            if(!this.isEmpty(vdom.virtualID)) {
                const vRender:ElmerRender = this.renderComponents[vdom.virtualID];
                if(vRender) {
                    return vRender.getLastDom();
                }
            } else {
                return vdom.dom;
            }
        }
    }
    private isTextNode(dom: any): boolean {
        return Object.prototype.toString.call(dom) === "[object Text]";
    }
}
