import { Common, queueCallFunc, TypeQueueCallParam } from "elmer-common";
import { HtmlParse, IVirtualElement, VirtualElement, VirtualRender } from "elmer-virtual-dom";
import { EComponent } from "../component/EComponent";
import { ElmerEvent } from "../events/ElmerEvent";
import { IElmerEvent } from "../events/IElmerEvent";
import { globalVar } from "../init/globalUtil";
import { autowired } from "../inject";
import { RenderQueue, TypeRenderQueueOptions } from "./RenderQueue";

export type TypeUIRenderOptions = {
    isRSV?: boolean; // Render first init
    htmlCode?: string|IVirtualElement;
};

type TypeElmerRenderOptions = {
    component: EComponent;
    container: HTMLElement;
    renderOptions: TypeUIRenderOptions;
    userComponents?: EComponent[];
    event: ElmerEvent;
    path: number[];
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

    private options: TypeElmerRenderOptions; // 当前render传入的参数
    private sourceDom: IVirtualElement; // 代码节点未渲染过的虚拟dom树
    private newDom: IVirtualElement; // 新节点渲染过的虚拟dom树
    private oldDom: IVirtualElement; // 旧dom节点
    private userComponents: any = {}; // 当前组件引用的自定义组件
    private eventObj: ElmerEvent; // 事件处理模块，全局只有一个对象，从最顶层往下传递
    private subscribeEvents: any = {}; // 当前已经设置事件监听的回调函数
    private virtualId: string;
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
    }
    async render(option: TypeRenderQueueOptions): Promise<any> {
        return new Promise<any>((resolve) => {
            this.renderQueue.startAction(this.virtualId, option, this.renderAction.bind(this), () => {
                resolve({});
            });
        });
    }
    private async renderAction(options:TypeRenderQueueOptions):Promise<any> {
        return new Promise<any>((resolve, reject) => {
            try {
                typeof this.options.component.$before === "function" && typeof this.options.component.$before();
                if(!this.sourceDom) {
                    let vdom:IVirtualElement;
                    if(typeof this.options.component.$render === "function") {
                        vdom = this.options.component.$render();
                    } else if(typeof this.options.component["render"] === "function") {
                        vdom = this.options.component["render"]();
                    } else {
                        vdom = this.options.component["templateCode"];
                    }
                    if(this.isString(vdom)) {
                        vdom = this.htmlParse.parse(vdom);
                    }
                    this.sourceDom = vdom;
                }
                this.oldDom = this.newDom;
                if(options.state) {
                    this.extend(this.options.component.state, options.state);
                }
                if(options.data) {
                    this.extend(this.options.component, options.data);
                }
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
                queueCallFunc(renderParams, ({}, params):any => {
                    return this.renderVirtualDom(params.parent, params.vdom, params.vdomParent);
                }).then(() => {
                    this.newDom = renderDom; // 渲染结束更新节点到对应的属性
                    resolve({});
                }).catch((err) => {
                    this.newDom = renderDom; // 渲染结束更新节点到对应的属性
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
    private replaceContent(checkItem:IVirtualElement, children: IVirtualElement[]): void {
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
    private renderVirtualDom(container:HTMLElement, vdom: IVirtualElement, vdomParent: IVirtualElement): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const elmerData = globalVar();
            const components = elmerData.components || {};
            if(this.isEmpty(vdom.tagName)) {
                reject({
                    statusCode: "VR_404",
                    message: "virtual dom node is not correct, missing tagName attribute"
                });
            } else {
                const UserComponent = this.userComponents[vdom.tagName] || components[vdom.tagName];
                if(typeof UserComponent === "function") {
                    console.log("当前定义元素为自定义组件");
                } else {
                    // 渲染浏览器标准元素
                    // vdom.status === "NORMAL"  不需要做任何操作
                    if(vdom.status === "APPEND") {
                        // 新增元素
                        this.vdomAppendRender(container,vdom,vdomParent);
                    } else if(vdom.status === "UPDATE") {
                        if(this.isDOM(vdom.dom)) {
                            this.renderDomAttribute(vdom.dom, vdom);
                        } else {
                            if(vdom.tagName === "text") {
                                ((vdom.dom as any) as Text).textContent = vdom.innerHTML;
                            } else {
                                // vdom.dom对象为undefined或null即为不存在对应的真实dom节点，需要新增
                                !vdom.dom && this.vdomAppendRender(container, vdom, vdomParent);
                            }
                        }
                    } else if(vdom.status === "MOVE") {
                        this.vdomMove(container, vdom, vdomParent);
                    } else if(vdom.status === "MOVEUPDATE") {
                        this.vdomMove(container, vdom, vdomParent);
                        this.renderDomAttribute(vdom.dom as HTMLElement, vdom);
                    }
                    if(vdom.status !== "DELETE" && vdom.children && vdom.children.length > 0) {
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
                            resolve({});
                        }).catch((err) => {
                            reject(err);
                        });
                    } else {
                        // 当没有子节点或者为Delete状态时需要标识未resolve状态
                        resolve({});
                    }
                }
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
    private vdomAppendRender(container:HTMLElement,vdom:IVirtualElement, vdomParent:IVirtualElement): void {
        const index = vdom.path[vdom.path.length - 1];
        const prevIndex = index - 1;
        const prevDom = vdomParent.children[prevIndex];
        const newDom = vdom.tagName !== "text" ? document.createElement(vdom.tagName) : document.createTextNode(vdom.innerHTML);
        (newDom as any).path = [...this.options.path, ...vdom.path];
        (newDom as any).virtualId = this.virtualId;
        if(prevDom) {
            // 查找到前一个节点，需要插入到前一个节点后面，紧跟着上一个节点，防止节点位置错误
            if(prevDom.dom) {
                const domNext = prevDom.dom.nextElementSibling;
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
            // 查找不到上一个节点，说明当前节点需要插入到第一个位置
            if(container.children.length > 0) {
                container.insertBefore(newDom, container.children[0]);
            } else {
                container.appendChild(newDom);
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
}
