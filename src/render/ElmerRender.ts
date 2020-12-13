import { Common, queueCallFunc, TypeQueueCallParam } from "elmer-common";
import { HtmlParse, IVirtualElement, VirtualElement, VirtualRender } from "elmer-virtual-dom";
import { ElmerWorker } from "elmer-worker";
import { EComponent, CONST_CLASS_COMPONENT_FLAG } from "../component/EComponent";
import { ElmerEvent } from "../events/ElmerEvent";
import { IElmerEvent } from "../events/IElmerEvent";
import { globalVar } from "../init/globalUtil";
import { autowired } from "../inject";
import { RenderQueue, TypeRenderQueueOptions } from "./RenderQueue";
import { InjectComponent } from "../middleware/InjectComponent";

export type TypeUIRenderOptions = {
    isRSV?: boolean; // Render first init
    htmlCode?: string|IVirtualElement;
};

type TypeElmerRenderOptions = {
    component: EComponent;
    container: HTMLElement;
    children?: IVirtualElement[];
    renderOptions: TypeUIRenderOptions;
    userComponents?: EComponent[];
    event: ElmerEvent;
    worker: ElmerWorker;
    path: number[];
    prevDom?: HTMLElement;
};

export class ElmerRender extends Common {

    @autowired(VirtualRender, "VirtualRender", new VirtualElement())
    private virtualRender: VirtualRender;
    @autowired(HtmlParse)
    private htmlParse: HtmlParse;
    @autowired(VirtualElement)
    private virtualElement: VirtualElement;
    @autowired(RenderQueue)
    private renderQueue: RenderQueue;
    @autowired(InjectComponent)
    private injectComponent: InjectComponent;

    private options: TypeElmerRenderOptions; // 当前render传入的参数
    private sourceDom: IVirtualElement; // 代码节点未渲染过的虚拟dom树
    private newDom: IVirtualElement; // 新节点渲染过的虚拟dom树
    private oldDom: IVirtualElement; // 旧dom节点
    private userComponents: any = {}; // 当前组件引用的自定义组件
    private eventObj: ElmerEvent; // 事件处理模块，全局只有一个对象，从最顶层往下传递
    private subscribeEvents: any = {}; // 当前已经设置事件监听的回调函数
    private virtualId: string;
    private renderComponents: any = {}; // 当前组件下的自定义组件渲染对象
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
        this.virtualId = this.guid() + "_" + (new Date()).getTime().toString(); // 当前自定义组件节点ID
        this.options = options;
        this.userComponents = {...userComponents, ...fromParentComponents};
        this.eventObj = options.event;
        this.options.component.setState = this.setComponentState.bind(this);
        this.options.component.setData = this.setComponentData.bind(this); // 当前方法由于需要变量所有属性影响性能不建议使用，使用setState会更好，兼容旧代码
        typeof this.options?.component?.$init === "function" && this.options?.component?.$init();
        if(typeof this.options.component.$resize === "function") {
            this.eventObj.subscribe("resize", this.options.path, this.options.component.$resize);
        }
    }
    /**
     * 获取最后一个渲染的真实元素
     */
    getLastDom():HTMLElement|null|undefined {
        if(this.newDom && this.newDom.children) {
            for(let i=this.newDom.children.length - 1;i>=0;i--) {
                if(this.newDom.children[i].status !== "DELETE") {
                    return this.newDom.children[i].dom as any;
                }
            }
        }
    }
    /**
     * 获取第一个渲染到browser的元素
     */
    getFirstDom():HTMLElement|null|undefined {
        if(this.newDom && this.newDom.children) {
            for(let i=0;i<this.newDom.children.length;i--) {
                if(this.newDom.children[i].status !== "DELETE") {
                    return this.newDom.children[i].dom as any;
                }
            }
        }
    }
    destroy(): void {
        this.eventObj.unsubscribeByPath(this.options.path);
        if(this.newDom) {
            this.newDom.children.map((itemDom:IVirtualElement) => {
                itemDom?.dom?.parentElement.removeChild(itemDom.dom);
            });
        }
        if(this.renderComponents) {
            Object.keys(this.renderComponents).map((virtualId: string) => {
                const vRender = <ElmerRender>this.renderComponents[virtualId];
                vRender.destroy();
            });
        }
        this.newDom = null;
        this.oldDom = null;
    }
    async render(option: TypeRenderQueueOptions): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.renderQueue.startAction(this.virtualId, option, this.renderAction.bind(this), () => {
                if(option.firstRender) {
                    typeof this.options.component.$didMount === "function" && this.options.component.$didMount();
                } else {
                    typeof this.options.component.$didUpdate === "function" && this.options.component.$didUpdate();
                }
                resolve({});
            }).catch((err) => {
                console.error(err);
                if(option.firstRender) {
                    typeof this.options.component.$didMount === "function" && this.options.component.$didMount();
                } else {
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
                vdom = this.options.component.$render();
            } else if(typeof this.options.component["render"] === "function") {
                vdom = this.options.component["render"]();
            } else {
                vdom = this.options.component["templateCode"];
            }
            if(this.isString(vdom)) {
                // vdom = this.htmlParse.parse(vdom);
                this.options.worker.callObjMethod("htmlParse","parse", vdom as any)
                    .then((resp) => {
                        resolve(resp.data);
                    }).catch((err) => {
                        console.error(vdom);
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
                    this.oldDom = this.newDom;
                    this.sourceDom = vdom;
                    if(options.state) {
                        this.extend(this.options.component.state, options.state);
                    }
                    if(options.data) {
                        this.extend(this.options.component, options.data);
                    }
                    this.replaceContent(this.sourceDom, this.options.children);
                    // 准备渲染虚拟dom，做数据绑定和diff运算
                    typeof this.options.component.$beforeVirtualRender === "function" && this.options.component.$beforeVirtualRender(this.sourceDom);
                    const renderDom = this.virtualRender.render(this.sourceDom, this.oldDom, this.options.component);
                    typeof this.options.component.$afterVirtualRender === "function" && this.options.component.$afterVirtualRender(renderDom);
                    typeof this.options.component.$beforeRender === "function" && this.options.component.$beforeRender();
                    // 准备渲染数据
                    const renderParams: TypeQueueCallParam[] = [];
                    renderDom.children.map((dom:IVirtualElement, index:number) => {
                        renderParams.push({
                            id: "virtualRender_" + index,
                            params: {
                                parent: this.options.container,
                                vdom:dom,
                                vdomParent: renderDom
                            }
                        });
                    });
                    queueCallFunc(renderParams, (option, params):any => {
                        let prevDom:any = option.lastResult ? option.lastResult.prevDom : null;
                        if(option.id === "virtualRender_0") {
                            prevDom = <any>this.options.prevDom;
                        }
                        return this.renderVirtualDom(params.parent, params.vdom, params.vdomParent, prevDom);
                    }).then(() => {
                        // this.newDom = renderDom; // 渲染结束更新节点到对应的属性
                        resolve({});
                    }).catch((err) => {
                        // this.newDom = renderDom; // 渲染结束更新节点到对应的属性
                        reject(err);
                    });
                    this.newDom = renderDom; // 渲染结束更新节点到对应的属性
                    this.options.component.vdom = renderDom;
                    this.deleteVDomOutOfLogic(renderDom.deleteElements); // 删除dom diff算法计算出需要手动删除的节点
                }).catch((err) => {
                    reject(err);
                });
            } catch(e) {
                // tslint:disable-next-line: no-console
                console.error(e);
                reject({
                    message: e.message,
                    statusCode: "T_500"
                });
            }
        });
    }
    private async setComponentState(state:any): Promise<any> {
        return new Promise((resolve, reject) => {
            if(this.isObject(state)) {
                const component = this.options.component;
                const stateKeys = Object.keys(state);
                let dataChanged = false;
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
                if(dataChanged) {
                    this.render({
                        state,
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
    /**
     * 对比当前组件所有属性, 当前方法不建议使用
     * @param data 对比数据
     * @param fn 重新渲染结束回调
     */
    private async setComponentData(data:any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            console.warn("The SetData method is not recommended. Use setstate instead。");
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
    /**
     * 渲染自定义组件在父组件定义的子组件内容
     * context不能和content[A-Z\-\_][A-Za-z0-9]{1,}共同使用,只能选择其一做配置
     * @param checkItem 检测组件
     * @param children 父组件定义的子组件内容
     */
    private replaceContent(checkItem:IVirtualElement, children?: IVirtualElement[]): void {
        // 当前component接收到children的时候才需要执行此方法，为减少循环提升性能
        if(children && children.length>0) {
            const contextWrapperReg = /^context([A-Z\-\_][0-9a-zA-Z]{1,})$/;
            for(let i=0;i<checkItem.children.length;i++) {
                const uItem = checkItem.children[i];
                if(uItem.status !== "DELETE") {
                    // --- 检测Item是否包含Content元素，检测到，替换为children
                    if(
                        /\<context\s*>\s*\S*\<\/context\s*\>/i.test(uItem.innerHTML) ||
                        /\<context\s*\/\>/i.test(uItem.innerHTML) ||
                        uItem.tagName === "context" ||
                        /\<content\s*>\s*\S*\<\/content\s*\>/i.test(uItem.innerHTML) ||
                        /\<content\s*\/\>/i.test(uItem.innerHTML) ||
                        uItem.tagName === "content" ||
                        /\<context[A-Z\-\_][0-9a-zA-Z]{1,}\s*\/\>/.test(uItem.innerHTML) ||
                        /\<context[A-Z\-\_][0-9a-zA-Z]{1,}\s*\>\s*\S*\<\/context[A-Z\-\_][0-9a-zA-Z]{1,}\s*\>/.test(uItem.innerHTML) ||
                        contextWrapperReg.test(uItem.tagName)) {
                        // 检测到当前dom是content元素或者包含content元素，
                        // 其他dom结构不用再做，
                        if(uItem.tagName.toLowerCase() === "content" || uItem.tagName.toLowerCase() === "context") {
                            let isContextKey = false;
                            let renderKeyReg = /([A-Z\-\_][0-9a-zA-Z]{1,})$/;
                            for(let j=0,mLen = children.length;j<mLen;j++) {
                                let renderKeyMatch = children[j].tagName.match(renderKeyReg);
                                if(renderKeyMatch) {
                                    const contextRegKey = "ChildrenWrapper" + renderKeyMatch[1];
                                    if(contextRegKey === children[j].tagName) {
                                        isContextKey = true;
                                        break;
                                    }
                                    renderKeyMatch = null;
                                }
                                children[j].isContent = true;
                            }
                            renderKeyReg = null;
                            if(!isContextKey) {
                                this.virtualElement.init(checkItem);
                                this.virtualElement.replaceAt(children, i);
                                this.virtualElement.clear();
                                break;
                            }
                        } else {
                            const contextMatch = uItem.tagName.match(contextWrapperReg);
                            if(contextMatch) {
                                const contextKey = "ChildrenWrapper" + contextMatch[1];
                                for(let j=0, mLen = children.length; j< mLen; j++) {
                                    if(contextKey === children[j].tagName) {
                                        for(let z=0,zLen = children[j].children.length;z<zLen;z++) {
                                            children[j].children[z].isContent = true;
                                        }
                                        this.virtualElement.init(checkItem);
                                        this.virtualElement.replaceAt(children[j].children, i);
                                        break;
                                    }
                                }
                            } else {
                                // 执行下一层搜索
                                this.replaceContent(checkItem.children[i], children);
                            }
                        }
                    }
                }
            }
        }
    }
    private renderVirtualDom(container:HTMLElement, vdom: IVirtualElement, vdomParent: IVirtualElement, prevDom?:HTMLElement|Text): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            try{
                const elmerData = globalVar();
                const components = elmerData.components || {};
                vdom.isDiff = false;
                if(this.isEmpty(vdom.tagName)) {
                    reject({
                        statusCode: "VR_404",
                        message: "virtual dom node is not correct, missing tagName attribute"
                    });
                } else {
                    const UserComponent = this.userComponents[vdom.tagName] || components[vdom.tagName];
                    if(typeof UserComponent === "function") {
                        this.renderUserComponent(UserComponent, container, vdom, vdomParent).then(() => {
                            resolve({});
                        }).catch((err) => {
                            reject(err);
                        })
                    } else {
                        // 渲染浏览器标准元素
                        // vdom.status === "NORMAL"  不需要做任何操作
                        if(vdom.status === "APPEND") {
                            // 新增元素
                            this.vdomAppendRender(container,vdom,vdomParent, prevDom);
                        } else if(vdom.status === "UPDATE") {
                            if(this.isDOM(vdom.dom)) {
                                this.renderDomAttribute(vdom.dom, vdom);
                            } else {
                                if(vdom.tagName === "text") {
                                    ((vdom.dom as any) as Text).textContent = vdom.innerHTML;
                                } else {
                                    // vdom.dom对象为undefined或null即为不存在对应的真实dom节点，需要新增
                                    !vdom.dom && this.vdomAppendRender(container, vdom, vdomParent, prevDom);
                                }
                            }
                        } else if(vdom.status === "MOVE") {
                            this.vdomMove(container, vdom, vdomParent);
                        } else if(vdom.status === "MOVEUPDATE") {
                            this.vdomMove(container, vdom, vdomParent);
                            this.renderDomAttribute(vdom.dom as HTMLElement, vdom);
                        } else if(vdom.status === "NORMAL") {
                            if(!vdom.dom) {
                                this.vdomAppendRender(container, vdom, vdomParent, prevDom);
                            }
                        }
                        if(vdom.status !== "DELETE") {
                            if(vdom.children && vdom.children.length > 0) {
                                // 当status为delete时删除父节点并移除事件监听就行，不需要在对子节点循环删除
                                const renderParams: TypeQueueCallParam[] = [];
                                vdom.children.map((childDom:IVirtualElement, index:number) => {
                                    renderParams.push({
                                        id: "virtualRender_" + index,
                                        params: {
                                            parent: vdom.dom,
                                            vdom:childDom,
                                            vdomParent: vdom
                                        }
                                    });
                                });
                                queueCallFunc(renderParams, ({}, params):any => {
                                    return this.renderVirtualDom(params.parent, params.vdom, params.vdomParent);
                                }).then(() => {
                                    resolve({
                                        prevDom: vdom.dom
                                    });
                                }).catch((err) => {
                                    console.error(err);
                                    reject(err);
                                });
                            } else {
                                resolve({
                                    prevDom: vdom.dom
                                });
                            }
                        } else {
                            // 节点不是删除状态时，children是空， 当前循环到此结束
                            if(vdom.status === "DELETE") {
                                // 当节点被标记为删除时，移除dom元素，并销毁事件监听和虚拟dom对象
                                // todo release all user defined component
                                this.eventObj.unsubscribeByPath([...this.options.path, ...vdom.path]);
                                if(vdom.dom) {
                                    vdom.dom.parentElement && vdom.dom.parentElement.removeChild(vdom.dom);
                                }
                                this.deleteVirtualDom(vdom);
                            }
                            resolve({
                                prevDom: vdom.dom
                            });
                        }
                    }
                    // 删除不必要的元素，不需要等待返回
                    this.deleteVDomOutOfLogic(vdom.deleteElements);
                }
            }catch(e) {
                reject({
                    statusCode: "RT_500",
                    message: e.message,
                    exception: e
                });
            }
        });
    }
    private renderUserComponent(UserComponent: any,container:HTMLElement, vdom: IVirtualElement, vdomParent: IVirtualElement):Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const prevDom = this.getPrevDom(vdom, vdomParent);
            vdom.tagAttrs = {
                isComponent: true
            };
            if(vdom.status === "APPEND") {
                const flag = (<any>UserComponent).flag;
                const props = vdom.props;
                this.injectComponent.beforeInitComponent(UserComponent, props, vdom);
                const virtualId = "component_" + this.guid();
                let component;
                if(flag === CONST_CLASS_COMPONENT_FLAG) {
                    // 类组件
                    component = new UserComponent(props);
                } else {
                    // 高阶组件，即是一个函数的静态组件
                    component = {
                        props,
                        __factory: UserComponent,
                        render: function() {
                            return this["__factory"](this.props);
                        }
                    };
                }
                const vRender = new ElmerRender({
                    component,
                    container,
                    children: vdom.children,
                    path: [...this.options.path, ...vdom.path],
                    event: this.eventObj,
                    worker: this.options.worker,
                    renderOptions: this.options.renderOptions,
                    prevDom: prevDom ? prevDom.dom as any : null
                });
                vdom.virtualID = virtualId;
                this.injectComponent.initComponent(component, UserComponent, vdom);
                this.renderComponents[virtualId] = vRender;
                vRender.render({
                    firstRender: true
                }).then(() => {
                    resolve({});
                }).catch((err) => {
                    reject(err);
                });
            } else if(vdom.status === "UPDATE") {
                const vRender:ElmerRender = this.renderComponents[vdom.virtualID];
                if(vRender) {
                    const props = {};
                    vRender.options.prevDom = prevDom ? prevDom.dom as any : null;
                    this.extend(props, vRender.options.component.props, true);
                    this.extend(props, vdom.changeAttrs, true);
                    this.injectComponent.beforeUpdateComponent(vRender.options.component, UserComponent, props, vdom);
                    typeof vRender.options.component.$willReceiveProps === "function" && vRender.options.component.$willReceiveProps(props, vRender.options.component.props);
                    // 预留执行其他方法
                }
                resolve({});
            } else if(vdom.status === "MOVE") {
                this.moveComponentPosition(container ,vdom, vdomParent);
                resolve({});
            } else if(vdom.status === "MOVEUPDATE") {
                this.moveComponentPosition(container, vdom, vdomParent);
                const vRender:ElmerRender = this.renderComponents[vdom.virtualID];
                if(vRender) {
                    const props = {};
                    vRender.options.prevDom = prevDom ? prevDom.dom as any : null;
                    this.extend(props, vRender.options.component.props, true);
                    this.extend(props, vdom.changeAttrs, true);
                    this.injectComponent.beforeUpdateComponent(vRender.options.component, UserComponent, props, vdom);
                    typeof vRender.options.component.$willReceiveProps === "function" && vRender.options.component.$willReceiveProps(props, vRender.options.component.props);
                    // 预留执行其他方法
                }
                resolve({});
            } else if(vdom.status === "DELETE") {
                const vRender:ElmerRender = this.renderComponents[vdom.virtualID];
                vRender && vRender.destroy();
                delete this.renderComponents[vdom.virtualID];
                resolve({});
            } else {
                resolve({});
            }
        });
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
        (vdom.dom as any).path = [...this.options.path, ...vdom.path];
    }
    private vdomAppendRender(container:HTMLElement,vdom:IVirtualElement, vdomParent:IVirtualElement, prevSlideDom?: HTMLElement|Text): void {
        const prevDom = this.getPrevDom(vdom, vdomParent);
        const newDom = vdom.tagName !== "text" ? document.createElement(vdom.tagName) : document.createTextNode(vdom.innerHTML);
        (newDom as any).path = [...this.options.path, ...vdom.path];
        (newDom as any).virtualId = this.virtualId;
        if(prevDom) {
            // 查找到前一个节点，需要插入到前一个节点后面，紧跟着上一个节点，防止节点位置错误
            let prevDomElement = prevDom.dom;
            if(prevDom?.tagAttrs?.isComponent) {
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
        if(vdom.tagName !== "text") {
            // 文本节点不需要做事件绑定和属性渲染
            this.renderDomAttribute(newDom as HTMLElement, vdom);
            this.bindDOMEvents(newDom as HTMLElement, vdom);
        }
        vdom.dom = newDom;
    }
    /**
     * 渲染dom属性值
     * @param dom 真实dom节点
     * @param vdom 虚拟dom节点
     */
    private renderDomAttribute(dom:HTMLElement, vdom:IVirtualElement): void {
        if(vdom.tagName === "text") {
            dom.textContent = vdom.innerHTML;
        } else {
            const updateProps = vdom.status === "APPEND" ? vdom.props : vdom.changeAttrs;
            if(updateProps) {
                Object.keys(updateProps).map((attrKey: string) => {
                    const attrValue = updateProps[attrKey];
                    if(/^checked$/i.test(attrKey)) {
                        dom.setAttribute(attrKey, attrValue ? "checked" : null);
                        (dom as any).checked = attrValue;
                    } else if(/^show$/i.test(attrKey)) {
                        dom.style.display = attrValue ? "block" : "none";
                    } else if(/^iShow$/.test(attrKey)) {
                        dom.style.display = attrValue ? "inline-block" : "none";
                    } else {
                        dom.setAttribute(attrKey, attrValue);
                    }
                });
            }
            if(vdom.deleteAttrs) {
                for(const attrKey of vdom.deleteAttrs) {
                    dom.removeAttribute(attrKey);
                }
            }
        }
    }
    /**
     * 绑定事件监听
     * @param dom 真实dom节点
     * @param vdom 虚拟dom节点数据
     */
    private bindDOMEvents(dom:HTMLElement, vdom:IVirtualElement): void {
        if(vdom.events && vdom.tagName !== "text") {
            (dom as any).virtualId = this.virtualId; // 给所有需要做事件绑定元素绑定当前层级上虚拟节点id，用于区分不同的节点
            Object.keys(vdom.events).map((eventName: string) => {
                const eventCallback = vdom.events[eventName];
                if(typeof eventCallback === "function") {
                    // 找到存在的回调函数再做事件监听绑定
                    const eventListener = ((vdomEvent:IVirtualElement,myEventName:string,callback:Function, handler: any) => {
                        return async(evt:IElmerEvent) => {
                            const newEvent:any = {
                                data: vdomEvent.data,
                                dataSet: vdomEvent.dataSet,
                                nativeEvent: evt.nativeEvent,
                                cancelBubble: false
                            };
                            if(myEventName === "input" && vdomEvent.dom) {
                                newEvent.value = (vdomEvent.dom as HTMLInputElement).value;
                            }
                            const eventResult = callback.call(handler, newEvent);
                            evt.cancelBubble = newEvent.cancelBubble;
                            return eventResult;
                        };
                    })(vdom, eventName, eventCallback, this.options.component);
                    const currentPath = [...this.options.path,...vdom.path];
                    const eventId = this.eventObj.subscribe(eventName, currentPath, eventListener);
                    this.subscribeEvents[eventId] = {
                        eventName,
                        callback: eventListener
                    };
                }
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
    private deleteVirtualDom(vdom:IVirtualElement): void {
        vdom.status === "DELETE";
        vdom.dom = null;
        vdom.events = null;
        vdom.props = {};
        if(vdom.children && vdom.children.length > 0) {
            vdom.children.map((vdomChild) => {
                this.deleteVirtualDom(vdomChild);
            });
        }
    }
    /**
     * 删除通过diff运算检测出在旧dom树存在节点，但是在新dom树没有出现节点的元素
     * 这种元素在新dom树无法标记，所以需要手动删除
     * @param deleteVdoms 
     */
    private deleteVDomOutOfLogic(deleteVdoms: IVirtualElement[]): void {
        if(deleteVdoms && deleteVdoms.length > 0) {
            for(const delDom of deleteVdoms) {
                if(delDom?.tagAttrs?.isComponent) {
                    const dRender = <ElmerRender>this.renderComponents[delDom.virtualID];
                    dRender && dRender.destroy();
                    delete this.renderComponents[delDom.virtualID];
                }else {
                    if(delDom.dom) {
                        delDom.dom.parentElement && delDom.dom.parentElement.removeChild(delDom.dom);
                        this.eventObj.unsubscribeByPath(delDom.path);
                    }
                }
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
        if(nextDom?.tagAttrs?.isComponent) {
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
}
