import { Common, queueCallFunc, TypeQueueCallParam } from "elmer-common";
import { HtmlParse, IVirtualElement, VirtualElement, VirtualRender } from "elmer-virtual-dom";
import { EComponent } from "../component/EComponent";
import { globalVar } from "../init/globalUtil";
import { autowired } from "../inject";

export type TypeUIRenderOptions = {
    isRSV?: boolean; // Render first init
    htmlCode?: string|IVirtualElement;
};

type TypeElmerRenderOptions = {
    component: EComponent;
    container: HTMLElement;
    renderOptions: TypeUIRenderOptions;
    userComponents?: EComponent[];
};

export class ElmerRender extends Common {

    @autowired(VirtualRender)
    private virtualRender: VirtualRender;
    @autowired(HtmlParse)
    private htmlParse: HtmlParse;
    @autowired(VirtualElement)
    private virtualElement: VirtualElement;

    private options: TypeElmerRenderOptions;
    private sourceDom: IVirtualElement;
    private oldDom: IVirtualElement;
    private userComponents: any[] = [];
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
        this.options = options;
        this.userComponents = {...userComponents, ...fromParentComponents};
        typeof this.options?.component?.$init === "function" && this.options?.component?.$init();
    }
    async render(firstRender?: boolean):Promise<any> {
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
                    resolve({});
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
                    if(vdom.status === "APPEND") {
                        // 新增元素
                        this.vdomAppendRender(container,vdom,vdomParent);
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
    private vdomAppendRender(container:HTMLElement,vdom:IVirtualElement, vdomParent:IVirtualElement): void {
        const index = vdom.path[vdom.path.length - 1];
        const prevIndex = index - 1;
        const prevDom = vdomParent.children[prevIndex];
        const newDom = document.createElement(vdom.tagName);
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
        this.renderDomAttribute(newDom, vdom);
        vdom.dom = newDom;
    }
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
}
