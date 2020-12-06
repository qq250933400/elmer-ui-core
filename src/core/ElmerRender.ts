import { Common } from "elmer-common";
import { defineContext, getContext } from "elmer-redux";
import { HtmlParse, IVirtualElement, VirtualElement, VirtualElementOperate, VirtualElementsDiff } from "elmer-virtual-dom";
import { IComponent } from "../component/IComponent";
import { SvgConfig } from "../configuration/SvgConfig";
import { autowired } from "../inject";
import { createClassFactory } from "../inject/createClassFactory";
import { IDeclareComponent } from "../interface/IDeclareComponentOptions";
import { IElmerRenderParams, TypeRenderEventData, TypeUIRenderOptions } from "../interface/IElmerRender";
import { InjectModel } from "../middleware";
import { InjectComponent } from "../middleware/InjectComponent";
import { RenderMiddleware } from "../middleware/RenderMiddleware";
import { IPropCheckRule } from "../propsValidation";
import { ElmerDOM } from "./ElmerDom";
import { addResize, removeResize } from "./ElmerUI";
import { ElmerVirtualRender } from "./ElmerVirtualRender";

export class ElmerRender extends Common {
    previousSibling?: HTMLElement|SVGSVGElement|Element|Text|Comment;
    virtualTarget: HTMLElement;
    renderComponent: any;
    htmlCode: any;
    parent?: HTMLElement;
    domList: any = {};
    contentDOM?: HTMLElement;
    contentChildren: HTMLElement[] = [];
    eventListeners: TypeRenderEventData[] = [];
    resizeID: string[] = [];
    virtualDomList: any = {};
    virtualId: string; // current virtual dom id
    nodeData: IVirtualElement;
    oldData: IVirtualElement;

    // isPropsChagneRefreshed
    // 用于检测是否在$willReceiveProps或者$onPropsChanged这两个生命周期函数调用setState,setData重新渲染组件
    // 如果未调用，并且children有变化需要自动重新渲染
    private isPropsChagneRefreshed: boolean = false;

    private isNeedParse: boolean = true;
    private htmlParseData: IVirtualElement;
    private contextStore: any;
    private uiOptions:TypeUIRenderOptions;
    private rsvAttachDom?: boolean;
    private path?: string[];

    @autowired(InjectComponent)
    private injectComponent: InjectComponent;
    @autowired(HtmlParse)
    private htmlParse: HtmlParse;
    @autowired(ElmerDOM)
    private dom:ElmerDOM;
    @autowired(RenderMiddleware)
    private renderMiddleware: RenderMiddleware;

    @autowired(VirtualElement)
    private virtualDom:VirtualElement;
    @autowired(VirtualElementsDiff, "VirtualElementsDiff", createClassFactory(VirtualElement))
    private virtualDiff: VirtualElementsDiff;
    @autowired(ElmerVirtualRender)
    private virtualRender:ElmerVirtualRender;

    @autowired(InjectModel)
    private injectModel:InjectModel;

    constructor(props: IElmerRenderParams) {
        super();
        this.virtualTarget = props.virtualTarget;
        this.renderComponent = props.component;
        this.htmlCode = props.htmlCode;
        this.renderComponent.parent = props.target || props.virtualTarget;
        this.contentDOM = props.contentDom;
        this.previousSibling = props.previousSibling;
        this.contextStore = props.context;
        this.uiOptions = props.uiRenderOptions;
        this.virtualId = this.isEmpty(props.virtualId) ? this.guid() : props.virtualId;
        this.path = props.path;
        this.extend(this.renderComponent,{
            addEvent: this.bindDomEvent.bind(this),
            setData: this.setComponentData.bind(this),
            setState: this.setComponentState.bind(this)
        }, true);
        // 初始化组件立即执行
        typeof this.renderComponent.$init === "function" && this.renderComponent.$init();
    }
    render(isFirstRender?: boolean): void {
        try {
            if(!isFirstRender) {
                // 修改context
                let getChildContext = this.renderComponent.getChildContext;
                let contextData = typeof getChildContext === "function" ? getChildContext.call(this.renderComponent) : null;
                if(contextData) {
                    const storeData = JSON.parse(JSON.stringify(this.contextStore));
                    this.extend(this.renderComponent.context, contextData);
                    this.extend(storeData, contextData);
                    this.contextStore = storeData;
                }
                getChildContext = null;
                contextData = null;
            }
            if (this.isFunction((this.renderComponent)["$before"])) {
                // tslint:disable-next-line: no-unnecessary-type-assertion
                const isUpdate = (<any>this.renderComponent)["$before"]();
                if (isUpdate !== undefined && !isUpdate) {
                    return;
                }
            }
            if(
                !this.renderComponent.template ||
                this.isEmpty(this.renderComponent.template.url) ||
                (this.renderComponent.template && !this.isEmpty(this.renderComponent.template.url) && this.renderComponent.template.fromLoader)
                ) {
                const htmlCode = this.renderComponent.render();
                this.setHtmlCode(htmlCode);
                this.renderHtml();
                this.afterRender(isFirstRender);
            } else {
                let ajaxHtmlCode = "";
                let ajaxHtmlCodeLoadCompleted = false;
                let beginTime = (new Date()).getTime();
                let endTime = beginTime;
                let timeout = this.renderComponent.template.timeout || 3000;
                // 异步加载模版信息
                this.renderComponent.loadTemplate(this.renderComponent.template.url, this.renderComponent.template.isEndPoint, this.renderComponent.template.ajaxType).then((resp:any) => {
                    ajaxHtmlCodeLoadCompleted = true;
                    ajaxHtmlCode = resp;
                    this.setHtmlCode(ajaxHtmlCode);
                    this.renderHtml();
                    this.afterRender(isFirstRender);
                }).catch((err:any) => {
                    ajaxHtmlCodeLoadCompleted = true;
                    ajaxHtmlCode = err.statusText || err.message || "<h6>Load Template fail.</h6>";
                });
                while(!ajaxHtmlCodeLoadCompleted) {
                    endTime = (new Date()).getTime();
                    const effTime = (endTime - beginTime);
                    if(effTime > timeout) {
                        break;
                    }
                }
                beginTime = null;
                endTime = null;
                timeout = null;
                this.setHtmlCode(ajaxHtmlCode);
                this.renderHtml();
                this.afterRender(isFirstRender);
            }
        } catch (e) {
            // define error elements
            const pathStr = this.path ? this.path.join("->") + "->" : "";
            // tslint:disable-next-line:no-console
            console.error(e, pathStr + this.getValue(this,"renderComponent.selector"));
        }
    }
    afterRender(isFirstRender: boolean):void {
        const myComponents: any[] = this.virtualDomList || {};
        if(!this.renderComponent["firstRender"]) {
            Object.keys(myComponents).map((myKey) => {
                const tmpComponent = myComponents[myKey];
                const curComponent = tmpComponent.component;
                const tmpRender = tmpComponent.render;
                if(curComponent["firstRender"]) {
                    delete(curComponent["firstRender"]);
                    tmpRender.afterRender();
                }
            });
            if(this.isFunction(this.renderComponent.$after)) {
                this.renderComponent.$after();
                // tslint:disable-next-line: no-console
                console.warn("Life cycle function $after will be removed in the new version. Please use didmount and didupdate instead");
            }
        }
        if(this.uiOptions && this.uiOptions.isRSV && !this.rsvAttachDom) {
            this.rsvAttachDom = true;
        }
        !isFirstRender && typeof this.renderComponent.$didUpdate === "function" && typeof this.renderComponent.$didUpdate();
    }
    /**
     * 在重新渲染组件前调用此方法释放所有绑定的事件
     */
    dispose(): void {
        this.releaseAllEvents();
        typeof this.renderComponent.$willMount === "function" && this.renderComponent.$willMount();
        if(this.nodeData && this.nodeData.children && this.nodeData.children.length>0) {
            this.nodeData.children.map((tmpChild, index) => {
               if(this.isDOM(tmpChild.dom)) {
                   if(tmpChild.dom.parentElement) {
                       tmpChild.dom.parentElement.removeChild(tmpChild.dom);
                   }
                }
               delete this.nodeData.children[index];
            });
        }
        (<any>this).nodeData = {};
        if (this.resizeID && this.resizeID.length > 0) {
            this.resizeID.map((id) => {
                removeResize(id);
            });
            this.resizeID = [];
        }
        // 清除保存的变量
        this.renderComponent && this.renderComponent.dom && Object.keys(this.renderComponent.dom).map((dKey:any) => {
            this.renderComponent.dom[dKey] = null;
            delete this.renderComponent.dom[dKey];
        });
        this.renderComponent && this.renderComponent.domList && Object.keys(this.renderComponent.domList).map((dKey:any) => {
            this.renderComponent.domList[dKey];
            delete this.renderComponent.domList[dKey];
        });
        // call injectComponent release event
        this.nodeData.virtualID = this.virtualId;
        this.injectComponent.releaseComponent(this.renderComponent, this.nodeData);
        // this.contentChildren = [];
        this.eventListeners = [];
        Object.keys(this.virtualDomList).map((tmpID)=> {
            this.virtualDomList[tmpID].render.dispose();
            this.virtualDomList[tmpID].render = null;
            this.virtualDomList[tmpID].component = null;
            this.virtualDomList[tmpID] = null;
            delete this.virtualDomList[tmpID];
        });
        this.isFunction(this.renderComponent["$dispose"]) && this.renderComponent["$dispose"]();
        // tslint:disable-next-line: forin
        for(const key in this.renderComponent) {
            // delete all the attributes
            delete this.renderComponent[key];
        }
        this.virtualDomList = {};
        this.renderComponent.dom = {};
        this.renderComponent = null;
        this.virtualTarget = null;
        delete this.renderComponent;
        delete this.virtualDiff;
        delete this.nodeData;
        delete this.htmlParse;
        delete this.htmlCode;
        delete this.injectComponent;
        delete this.injectModel;
        // -----------------------
    }
    /**
     * 绑定DOM事件，将操作保存，用于在组件销毁时注销事件监听
     * @param dom 要绑定事件的DOM元素
     * @param eventName 事件名称
     * @param eventAction 绑定到事件的回调函数
     */
    bindDomEvent(handler:any, dom: HTMLElement | null | undefined | any, eventName: string, eventAction: Function, options?:AddEventListenerOptions, dataSet?:any): void {
        if(typeof eventAction === "function") {
            if(this.eventListeners && this.isArray(this.eventListeners)) {
                ((eventListeners, evtDom, evtHandler, evtName, evtAction, evtOptions:AddEventListenerOptions, dataSetValue:any)=> {
                    // tslint:disable-next-line:only-arrow-functions
                    const bindAction = function(event: any): any {
                        if(typeof evtAction === "function") {
                            return evtAction.apply(evtHandler,[
                                    {
                                        data: evtHandler.data,
                                        dataSet: dataSetValue,
                                        nativeEvent: event,
                                        target: evtDom
                                    },
                                    evtHandler.data,
                                    evtDom
                                ]
                            );
                        }
                    };
                    this.dom.on(evtDom, evtName,bindAction, evtOptions);
                    // 此处做法避免使用匿名函数做handler 导致removeEvent失败.
                    eventListeners.push({
                        callBack: bindAction,
                        eventName,
                        obj: dom,
                        options: evtOptions
                    });
                })(this.eventListeners, dom, handler, eventName, eventAction, options, dataSet);
            } else {
                // tslint:disable-next-line:no-console
                console.warn("The render object was disposed, Please check the bindEvent logic.", eventName);
            }
        }
    }
    renderHtml(): void {
        let sourceDom = this.virtualDom.create("VirtualRoot");
        let oldDom:IVirtualElement = this.nodeData || this.virtualDom.create("VirtualRoot");
        if(!this.htmlParseData || this.isNeedParse) {
            if(!this.isEmpty(this.htmlCode)) {
                if(this.isString(this.htmlCode)) {
                    this.htmlParseData = this.htmlParse.parse(this.htmlCode, this.renderComponent.selector);
                    sourceDom = JSON.parse(JSON.stringify(this.htmlParseData));
                } else {
                    // tslint:disable-next-line:no-console
                    console.error(this.htmlCode, "----This Component don't need to parse code");
                }
            } else {
                this.htmlParseData = sourceDom;
            }
        } else {
            sourceDom = JSON.parse(JSON.stringify(this.htmlParseData));//
        }
        // -----虚拟dom渲染，先将逻辑和数据渲染到虚拟dom上
        typeof this.renderComponent.$beforeVirtualRender === "function" && this.renderComponent.$beforeVirtualRender(sourceDom);
        this.virtualRender.setComponentData(this.renderComponent, sourceDom);
        this.virtualRender.render();
        // -----在做diff操作前需先判断从父组件传过来影响显示或隐藏的属性
        if(this.renderComponent.props && (!this.isEmpty(this.renderComponent.props.if) || !this.isEmpty(this.renderComponent.props.show))) {
            sourceDom.children.map((tmpSource:IVirtualElement, index:number) => {
                if(!this.isEmpty(this.renderComponent.props.if)) {
                    tmpSource.props.if = this.renderComponent.props.if;
                }
                if(!this.isEmpty(this.renderComponent.props.show)) {
                    tmpSource.props.show = this.renderComponent.props.show;
                }
            });
        }
        typeof this.renderComponent.$afterVirtualRender === "function" && this.renderComponent.$afterVirtualRender(sourceDom);
        const updateChildren = this.renderComponent.props ? this.renderComponent.props.children : [];
        this.replaceContent(sourceDom, updateChildren); // 替换元素需提前做否则影响渲染过程
        typeof this.renderComponent.$beforeDiff === "function" && this.renderComponent.$beforeDiff(sourceDom);
        this.virtualDiff.diff(sourceDom, oldDom, this.renderComponent.selector);
        typeof this.renderComponent.$afterDiff === "function" && this.renderComponent.$afterDiff(sourceDom);
        const beforeRenderResult = this.isFunction(this.renderComponent["$beforeRender"]) ? this.renderComponent["$beforeRender"](sourceDom, oldDom) : null;
        if(beforeRenderResult === null || beforeRenderResult === undefined || beforeRenderResult) {
            this.nodeData = sourceDom;
            // -------------渲染虚拟dom到真实dom树中
            this.releaseAllEvents();
            this.renderNodeDataToDOM(sourceDom, this.virtualTarget, true);
        }
        this.deleteElements(sourceDom);
        this.virtualDom.releaseDom(this.oldData);
        this.virtualDom.clear();
        this.oldData = null;
        oldDom = null;
    }
    /**
     * 用户不允许调用此方法，当前方法是在渲染content元素时，绑定node到component
     * @param id [string] id属性
     * @param dom [HTMLElement|Component] 绑定的元素
     */
    setDomToParent(id: string, dom:any): void {
        throw new Error("Can not user this function before bind to User Component");
    }
    /**
     * Set html source code to render attribute
     * @param nHtmlCode [String|Module]
     */
    private setHtmlCode(nHtmlCode: any): void {
        let htmlCodeData = null;
        if(this.getType(nHtmlCode) === "[object Module]") {
            htmlCodeData = nHtmlCode.default;
            if(this.isString(htmlCodeData)) {
                this.isNeedParse = this.htmlCode !== htmlCodeData;
            } else {
                this.isNeedParse = false;
                this.htmlParseData = htmlCodeData;
            }
        } else {
            htmlCodeData = nHtmlCode;
            if(this.isString(htmlCodeData)) {
                this.isNeedParse = this.htmlCode !== htmlCodeData;
            } else {
                this.htmlParseData = htmlCodeData;
                this.isNeedParse = false;
            }
        }
        this.htmlCode = htmlCodeData || "";
    }
    private renderDomEvents(dom: HTMLElement, events: any[],domData:IVirtualElement, dataSet:any): void {
        if(events && this.isArray(events) && events.length>0) {
            events.map((evt:any) => {
                let isBinded = false;
                if(/transitionEnd/.test(evt.eventName)) {
                    const transitions = {
                        MozTransition: "transitionend",
                        MsTransition: "msTransitionEnd",
                        OTransition: "oTransitionEnd",
                        WebkitTransition: "webkitTransitionEnd",
                        transition: "transitionend"
                    };
                    if(dom) {
                        for (const t in transitions) {
                            if (dom.style[t] !== undefined) {
                                evt.eventName = transitions[t];
                                break;
                            }
                        }
                    }
                }
                if(/animationEnd/.test(evt.eventName)) {
                    const animations = {
                        MozAnimation: "animationend",
                        MsAnimation: "msAnimationEnd",
                        OAnimation: "oAnimationEnd",
                        WebkitAnimation: "webkitAnimationEnd",
                        animation: "animationend"
                    };
                    if(dom) {
                        for (const t in animations) {
                            if (dom.style[t] !== undefined) {
                                evt.eventName = animations[t];
                                break;
                            }
                        }
                    }
                }
                for(const tmpListen of this.eventListeners) {
                    if(tmpListen["eventName"] === evt.eventName && tmpListen["obj"] === dom) {
                        isBinded = true;
                        break;
                    }
                }
                if(!isBinded) {
                    const passive = domData.props.passive !== undefined && domData.props.passive !== null ? domData.props.passive : true;
                    this.bindDomEvent(evt.handler,dom, evt.eventName, evt.callBack,{
                        capture: !this.isEmpty(dom.getAttribute("capture")),
                        passive
                    }, dataSet);
                }
            });
        }
    }
    private releaseAllEvents(): void {
        if(this.isArray(this.eventListeners)) {
            this.eventListeners.map((tmpListener: TypeRenderEventData, index) => {
                // todo
                // this.dom.unbind(tmpListener.obj);
                this.dom.removeEvent(tmpListener.obj, tmpListener.eventName, tmpListener.callBack, tmpListener.options);
                this.eventListeners[index] = null;
                delete(this.eventListeners[index]);
            });
        }
        this.eventListeners = [];
    }
    private renderNodeDataToDOM(nodeData:IVirtualElement, parent:HTMLElement, isFirstLevel?: boolean, isSVG?: boolean): void {
        nodeData.children.map((itemNode:IVirtualElement, index:number) => {
            if(nodeData.isContent) {
                itemNode.isContent = nodeData.isContent;
            }
            this.nodeDataToDOM(itemNode, parent, isFirstLevel, index, isSVG);
        });
    }
    private nodeDataToDOM(nodeData: IVirtualElement, parent: HTMLElement | Text, isFirstLevel?: boolean, position?:number, isSVG?: boolean): void {
        if (nodeData.tagName !== undefined && nodeData.tagName !== null && !/^content$/i.test(nodeData.tagName)) {
            let defineComponent = <Function>elmerData.components[nodeData.tagName];
            if((defineComponent === undefined || defineComponent === null) && this.isArray(this.renderComponent.components)) {
                let components:IDeclareComponent[] = this.renderComponent.components;
                for(const key in components) {
                    if(components[key].selector === nodeData.tagName) {
                        defineComponent = components[key].component;
                        break;
                    }
                }
                components = null;
            }
            if (!this.isFunction(defineComponent)) {
                // create Element
                if (!this.isEmpty(nodeData.tagName) && !/^\<\!--/i.test(nodeData.tagName) && !/^text$/i.test(nodeData.tagName) && !/^content$/i.test(nodeData.tagName)) {
                    let nextParent = null;
                    let dataProps: any = nodeData.props || {};
                    if(nodeData.tagName !== "svg" && !isSVG) {
                        if(nodeData.status === VirtualElementOperate.APPEND) {
                            const defineDom:HTMLElement = <HTMLElement>this.getAppendDom(nodeData, <HTMLElement>parent, isSVG);
                            this.renderDomEvents(defineDom, nodeData.events,nodeData, nodeData.dataSet);
                            this.renderDomAttribute(defineDom, nodeData,isFirstLevel);
                            this.appendVirtualToDom(<HTMLElement>parent, defineDom, nodeData, isFirstLevel, position);
                            nextParent = defineDom;
                            if(nodeData.props && nodeData.props.id) {
                                if(!nodeData.isContent || nodeData.props.attach) {
                                    this.renderComponent.dom[nodeData.props.id] = defineDom;
                                }
                                if(nodeData.isContent) {
                                    this.setDomToParent(nodeData.props.id, defineDom);
                                }
                            }
                        } else if (nodeData.status === VirtualElementOperate.DELETE) {
                            if(nodeData.dom) {
                                this.dom.unbind(<HTMLElement>nodeData.dom);
                                nodeData.dom.parentElement && nodeData.dom.parentElement.removeChild(nodeData.dom);
                                nodeData.dom = null;
                                // delete nodeData.dom;
                                // 删除DOM数据
                            }
                            this.releaseNodeDataChildren(nodeData);
                        } else if(nodeData.status === VirtualElementOperate.UPDATE) {
                            this.renderDomEvents(<HTMLElement>nodeData.dom, nodeData.events,nodeData, nodeData.dataSet);
                            this.renderDomAttribute(<HTMLElement>nodeData.dom, nodeData,isFirstLevel);
                            nextParent = nodeData.dom;
                        } else if (nodeData.status === VirtualElementOperate.NORMAL) {
                            this.renderDomEvents(<HTMLElement>nodeData.dom, nodeData.events,nodeData, nodeData.dataSet);
                            nextParent = nodeData.dom;
                        } else {
                            nextParent = nodeData.dom;
                        }
                        if(/style/i.test(nodeData.tagName) && nextParent) {
                            if (nodeData.status === VirtualElementOperate.UPDATE || nodeData.status === VirtualElementOperate.APPEND) {
                                nextParent.innerHTML = nodeData.innerHTML;
                            }
                        } else if(/script/i.test(nodeData.tagName)) {
                            nextParent.innerHTML = "// Unsafe code: Script code is not allowed to appear in template.";
                            // tslint:disable-next-line:no-console
                            console.error("Unsafe code: Script code is not allowed to appear in template.");
                        }
                        if (/^html$/i.test(dataProps.dataType) || /^html$/i.test(dataProps["data-type"])) {
                            if(nodeData.status !== "DELETE") {
                                let codeResult = "";
                                nodeData.children.map((codeChild:IVirtualElement) => {
                                    const attrList = [];
                                    if(codeChild.props) {
                                        // tslint:disable-next-line: forin
                                        for(const key in codeChild.props) {
                                            attrList.push(`${key}=${JSON.stringify(codeChild.props[key])}`);
                                        }
                                    }
                                    if(codeChild.tagName !== "text") {
                                        codeResult += `<${codeChild.tagName} ${attrList.join(" ")}>`;
                                    }
                                    codeResult += codeChild.innerHTML;
                                    if(codeChild.tagName !== "text") {
                                        codeResult += `</${codeChild.tagName}>`;
                                    }
                                });
                                if(nextParent) {
                                    nextParent.innerHTML = codeResult;
                                } else {
                                    if(nodeData.dom) {
                                        (<HTMLElement>nodeData.dom).innerHTML = codeResult;
                                    }
                                }
                            }
                        } else {
                            if(nodeData.children && nodeData.children.length>0 && nextParent) {
                                this.renderNodeDataToDOM(nodeData, nextParent, false);
                            }
                        }
                    } else {
                        if(nodeData.status === "APPEND") {
                            const svgParent:Element = <Element>this.getAppendDom(nodeData, <HTMLElement>parent, true);
                            this.renderSVGAttribute(svgParent, nodeData,isFirstLevel);
                            if(parent) {
                                let svgHtmlCode = "";
                                nodeData.children.map((tmpItem: IVirtualElement) => {
                                    svgHtmlCode += tmpItem.innerHTML || "";
                                });
                                svgParent.innerHTML = svgHtmlCode;
                                nodeData.dom = svgParent;
                                (<HTMLElement>parent).appendChild(svgParent);
                                if(nodeData.children.length > 0) {
                                    this.renderNodeDataToDOM(nodeData, <HTMLElement>nodeData.dom, false, true);
                                }
                            }
                        } else if(nodeData.status === "UPDATE") {
                            this.renderDomEvents(<HTMLElement>nodeData.dom, nodeData.events,nodeData, nodeData.dataSet);
                            this.renderDomAttribute(<HTMLElement>nodeData.dom, nodeData,isFirstLevel);
                            if(nodeData.children.length > 0) {
                                this.renderNodeDataToDOM(nodeData, <HTMLElement>nodeData.dom, false, true);
                            }
                        } else if(nodeData.status === "DELETE") {
                            if(nodeData.dom && nodeData.dom.parentElement) {
                                nodeData.dom.parentElement.removeChild(nodeData.dom);
                            }
                            this.releaseNodeDataChildren(nodeData);
                        }
                    }
                    dataProps = null;
                    nextParent = null;
                } else if(/^text$/i.test(nodeData.tagName)) {
                    if(nodeData.status === VirtualElementOperate.APPEND) {
                        const textData = <HTMLElement>this.getAppendDom(nodeData, <HTMLElement>parent, isSVG);// document.createTextNode(nodeData.innerHTML);
                        this.appendVirtualToDom(<HTMLElement>parent,textData, nodeData,isFirstLevel, position);
                        if(nodeData.props && nodeData.props.id) {
                            if(!nodeData.isContent) {
                                this.renderComponent.dom[nodeData.props.id] = textData;
                            } else {
                                this.setDomToParent(nodeData.props.id, textData);
                            }
                        }
                    } else if (nodeData.status === VirtualElementOperate.DELETE) {
                        // delete
                        if(nodeData.dom) {
                            this.dom.unbind(<HTMLElement>nodeData.dom);
                            nodeData.dom.parentElement && nodeData.dom.parentElement.removeChild(nodeData.dom);
                            nodeData.dom = null;
                            delete nodeData.dom;
                        }
                    } else if (nodeData.status === VirtualElementOperate.UPDATE) {
                        // update
                        if(nodeData.dom) {
                            (<Text>nodeData.dom).data = nodeData.innerHTML;
                        }
                    }
                    this.deleteElements(nodeData);
                } else if(/^\<\!--/i.test(nodeData.tagName)) {
                    if(nodeData.status === VirtualElementOperate.APPEND) {
                        const cmtDom = <HTMLElement>this.getAppendDom(nodeData, <HTMLElement>parent, isSVG);// document.createComment(nodeData.innerHTML);
                        this.appendVirtualToDom(<HTMLElement>parent,cmtDom, nodeData, isFirstLevel, position);

                        if(nodeData.props && nodeData.props.id) {
                            this.renderComponent.dom[nodeData.props.id] = cmtDom;
                        }
                    } else if (nodeData.status === VirtualElementOperate.DELETE) {
                        // delete
                        if(nodeData.dom) {
                            this.dom.unbind(<HTMLElement>nodeData.dom);
                            nodeData.dom.parentElement.removeChild(nodeData.dom);
                            nodeData.dom = null;
                            delete nodeData.dom;
                        }
                        // this.virtualDom.releaseDom(nodeData);
                    } else if (nodeData.status === VirtualElementOperate.UPDATE) {
                        // update
                        if(nodeData.dom) {
                            (<Text>nodeData.dom).data = nodeData.innerHTML;
                        }
                    }
                    this.deleteElements(nodeData);
                }
            } else {
                nodeData.tagAttrs = {
                    ...(nodeData.tagAttrs || {}),
                    isComponent: true
                };
                const hasChildrenChanged = this.isNodeHasChange(nodeData); // 检测component子节点变化，当content内容有变化需要出发component的 onPropsChanged事件
                // if(this.renderComponent.props.id === "appRightArea" || this.renderComponent.props.title==="UI编辑器") {
                //     console.log(this.renderComponent.selector, hasChildrenChanged);
                //     debugger;
                // }
                if(hasChildrenChanged) {
                    const prevSibling: HTMLElement|SVGSVGElement|Element|Text|Comment = this.getPrevDom(nodeData);
                    this.renderUserComponent(defineComponent, nodeData, <HTMLElement>parent, prevSibling, isFirstLevel, hasChildrenChanged);
                } else {
                    // 当没有children 修改时检测context是否修改
                    if(defineComponent["contextType"]) {
                        const oldVirtualDom = this.virtualDomList[nodeData.virtualID];
                        if(oldVirtualDom) {
                            const contextData = getContext(this, defineComponent["contextType"]);
                            const isContextChange = JSON.stringify(oldVirtualDom.component.context) !== JSON.stringify(contextData);
                            if(isContextChange) {
                                typeof oldVirtualDom.component["$contextChange"] === "function" && oldVirtualDom.component["$contextChange"](contextData, JSON.parse(JSON.stringify(oldVirtualDom.component.context)));
                            }
                            delete oldVirtualDom.component.context;
                            this.defineReadOnlyProperty(oldVirtualDom.component, "context", contextData);
                        }
                    }
                }
            }
        }
        this.deleteElements(nodeData);
    }
    private renderUserComponent(
        componentClass: Function,
        nodeData: IVirtualElement,
        targetParent: HTMLElement,
        previousSibling: HTMLElement|SVGSVGElement|Element|Text|Comment,
        isFirstLevel?: boolean,
        contentChangeOnly?:boolean
    ): void {
        if(nodeData.status !== VirtualElementOperate.DELETE) {
            if(nodeData.status === VirtualElementOperate.UPDATE) {
                const oldVirtualDom = this.virtualDomList[nodeData.virtualID];
                if(oldVirtualDom && oldVirtualDom.component) {
                    const dataProps = nodeData.props||{};
                    const props = {};
                    // 定义有contextType规则的component执行更新context内容
                    if(componentClass["contextType"]) {
                        const contextData = getContext(this, componentClass["contextType"]);
                        const isContextChange = JSON.stringify(oldVirtualDom.component.context) !== JSON.stringify(contextData);
                        if(isContextChange) {
                            typeof oldVirtualDom.component["$contextChange"] === "function" && oldVirtualDom.component["$contextChange"](contextData, JSON.parse(JSON.stringify(oldVirtualDom.component.context)));
                        }
                        delete oldVirtualDom.component.context;
                        this.defineReadOnlyProperty(oldVirtualDom.component, "context", contextData);
                    }
                    // 开始检查props是否与变化，有变化触发onPropsChanged回调函数
                    this.defineReadOnlyProperty(props, "children", this.getComponentChildren(nodeData));
                    this.extend(props, dataProps, true);
                    this.extend(props, this.getUserComponentEvents(nodeData), true);
                    // 在更新已存在的组件时先调用此方法，以便做扩展
                    this.injectComponent.beforeUpdateComponent(oldVirtualDom.component, componentClass, props, nodeData);
                    // 确认props有新的变化后再执行渲染过程，减少渲染次数
                    if(!this.isEqual(oldVirtualDom.component.props, props)) {
                        const oldProps:any = oldVirtualDom.component.props;
                        delete  oldVirtualDom.component.props;
                        this.defineReadOnlyProperty(oldVirtualDom.component, "props", props);
                        this.injectComponent.run(oldVirtualDom.component, componentClass, nodeData);
                        this.isPropsChagneRefreshed = false;
                        if(typeof oldVirtualDom.component["$willReceiveProps"] === "function") {
                            typeof oldVirtualDom.component["$willReceiveProps"] === "function" && oldVirtualDom.component["$willReceiveProps"](props, oldProps);
                        } else {
                            // 兼容旧版本的代码
                            typeof oldVirtualDom.component["$onPropsChanged"] === "function" && oldVirtualDom.component["$onPropsChanged"](props, oldProps);
                        }
                        if(!this.isPropsChagneRefreshed && contentChangeOnly) {
                            // props 有变换并且自定义组件children有变化，但是并未执行重绘操作时需要重新渲染组件
                            oldVirtualDom.render.renderHtml();
                        }
                    }
                }
            } else if(nodeData.status === VirtualElementOperate.APPEND) {

                // 当前动作将自定义组件渲染到真实dom树中
                const dataProps = nodeData.props||{};
                const domID = this.getRandomID();
                nodeData.virtualID = domID; // 提前定义virtualID ,否则导致redux,injectComponent执行的方法无法正确获取virtualID
                const props = {};
                this.defineReadOnlyProperty(props, "children", this.getComponentChildren(nodeData));
                this.extend(props, dataProps, true);
                this.extend(props, this.getUserComponentEvents(nodeData), true);
                this.injectComponent.beforeInitComponent(componentClass, props, nodeData);

                const component: IComponent = new (<any>componentClass)(props, getContext(this, (<any>componentClass).contextType), "contextStore");
                let getChildrenContext = (<any>component).getChildContext;
                let mapContextData = typeof getChildrenContext === "function" ? getChildrenContext.call(component) : null;
                let childContextData = mapContextData ? defineContext(this, {
                    contextData: mapContextData,
                    saveAttrKey: "contextStore"
                }) : this.contextStore;
                // 父组件引用的自定义组件在子组件也可以使用，不需要再次Import
                let UserDefineComponents:IDeclareComponent[] = this.renderComponent.components;
                if(UserDefineComponents && UserDefineComponents.length>0) {
                    let myComponents:any[] = (<any>component).components || [];
                    myComponents.push(...UserDefineComponents);
                    delete (<any>component).components;
                    this.defineReadOnlyProperty(component, "components", myComponents);
                    UserDefineComponents = null;
                    myComponents = null;
                }
                const render = new ElmerRender({
                    component,
                    contentDom: null,
                    context: JSON.parse(JSON.stringify(childContextData)),
                    htmlCode: "",
                    path: !this.isEmpty(this.renderComponent.selector) ? (this.path && this.path.length > 0 ? [...this.path, this.renderComponent.selector] : [this.renderComponent.selector]) : [],
                    previousSibling,
                    uiRenderOptions: this.uiOptions,
                    virtualId: domID,
                    virtualTarget: targetParent
                });
                this.injectComponent.initComponent(component, componentClass, nodeData);
                this.injectComponent.run(component, componentClass, nodeData);
                this.injectModel.inject(component, component["injectModel"], "model", false);
                this.injectModel.inject(component, component["injectService"], "service", true);
                if((component["model"] && Object.keys(component["model"]).length>0) || (component["service"] && Object.keys(component["service"]).length>0)) {
                    this.isFunction(component["$inject"]) && component["$inject"]();
                }
                if (this.isFunction((<any>component)["$resize"])) {
                    const resizeID = this.getRandomID();
                    const resizeFn = (<Function>(<any>component)["$resize"])();
                    if(typeof resizeFn === "function") {
                        (<any>component)["ResizeID"] = resizeID;
                        this.resizeID.push(resizeID);
                        addResize(resizeID, resizeFn.bind(component));
                    }
                }
                render.setDomToParent = (id:string, domObj:any) => {
                    if(!this.isEmpty(id) && domObj) {
                        this.renderComponent.dom[id] = domObj;
                    }
                };
                (<any>component)["firstRender"] = true;
                render.render(true);
                this.defineReadOnlyProperty(component, "firstLevel", isFirstLevel);
                this.defineReadOnlyProperty(component, "domData", render.nodeData);
                if (!this.isEmpty(props["id"])) {
                    if (this.renderComponent.dom === undefined || this.renderComponent.dom === null) {
                        this.renderComponent.dom = {};
                    }
                    if(!nodeData.isContent || nodeData.props.attach) {
                        this.renderComponent.dom[props["id"]] = component;
                    }
                    if(nodeData.isContent) {
                        this.setDomToParent(nodeData.props.id, component);
                    }
                }
                // 显示定义的属性
                if (props["help"]) {
                    const propTypeRules = (<any>componentClass).propType || {};
                    const contextTypeRules = (<any>componentClass).contextType || {};
                    // tslint:disable:no-console
                    const isLog = typeof console.table === "function";
                    let properties = [];
                    console.log("------------>");
                    console.log("Component: ", nodeData.tagName);
                    // tslint:enable:no-console
                    Object.keys(propTypeRules).map((propKey: string) => {
                        let rule:IPropCheckRule = propTypeRules[propKey];
                        let typeName = rule.rule ? (<any>rule.rule).type || "Undefine TypeName" : "Undefine TypeName";
                        if(isLog) {
                            properties.push({
                                defaultValue: rule.defaultValue,
                                description: "[props属性]" + rule.description,
                                propertyName: propKey,
                                type: typeName
                            });
                        } else {
                            // tslint:disable-next-line:no-console
                            console.log(`propertyName: ${propKey}`,`type: ${typeName}`, `description: [props属性]${rule.description}`, "defaultValue: ", rule.defaultValue);
                        }
                        rule = null;
                        typeName = null;
                    });
                    // tslint:enable:no-console
                    Object.keys(contextTypeRules).map((propKey: string) => {
                        let rule:IPropCheckRule = contextTypeRules[propKey];
                        let typeName = rule.rule ? (<any>rule.rule).type || "Undefine TypeName" : "Undefine TypeName";
                        if(isLog) {
                            properties.push({
                                defaultValue: rule.defaultValue,
                                description: "[context属性]" + rule.description,
                                propertyName: propKey,
                                type: typeName
                            });
                        } else {
                            // tslint:disable-next-line:no-console
                            console.log(`propertyName: ${propKey}`,`type: ${typeName}`, `description: [context属性]${rule.description}`, "defaultValue: ", rule.defaultValue);
                        }
                        rule = null;
                        typeName = null;
                    });
                    // tslint:disable-next-line:no-console
                    if(typeof console.table === "function") {
                        // tslint:disable-next-line:no-console
                        console.table(properties);
                    }
                    properties = null;
                }
                typeof component.$didMount === "function" && component.$didMount();
                this.virtualDomList[domID] = {
                    component,
                    render
                };
                nodeData.tagAttrs["lastChild"] = this.getLastDom(render.nodeData);
                getChildrenContext = null;
                mapContextData = null;
                childContextData = null;
            } else if(nodeData.status === VirtualElementOperate.NORMAL) {
                if(contentChangeOnly) {
                    const oldVirtualDom = this.virtualDomList[nodeData.virtualID];
                    if(oldVirtualDom && oldVirtualDom.component) {
                        delete oldVirtualDom.component.props.children;
                        this.defineReadOnlyProperty(oldVirtualDom.component.props, "children", nodeData.children);
                        oldVirtualDom.render.renderHtml();
                    }
                }
            }
        } else {
            const oldVirtualDom = this.virtualDomList[nodeData.virtualID];
            nodeData.tagAttrs = {
                ...(nodeData.tagAttrs || {}),
                isDelete: true
            };
            if(oldVirtualDom) {
                oldVirtualDom.render.dispose();
                delete this.virtualDomList[nodeData.virtualID];
                if(!this.isEmpty(nodeData.props.id)) {
                    delete this.renderComponent.dom[nodeData.props.id];
                }
            }
        }
    }
    private isNodeHasChange(nodeData:IVirtualElement): boolean {
        let result = false;
        if(nodeData.status === "DELETE" || nodeData.status === "APPEND" || nodeData.status === "UPDATE") {
            result = true;
        } else {
            // 只有当status为normal的时候需要做检测
            if(nodeData.children.length > 0) {
                const checkChangeTask:Function[] = [];
                for(const item of nodeData.children) {
                    if(item.status === "DELETE" || item.status === "APPEND" || item.status === "UPDATE") {
                        result = true;
                        break;
                    } else {
                        checkChangeTask.push(((checkItem:IVirtualElement) => {
                            return () => {
                                return this.isNodeHasChange(checkItem);
                            };
                        })(item));
                    }
                }
                if(!result) {
                    for(const runTask of checkChangeTask) {
                        if(runTask()) {
                            result = true;
                            break;
                        }
                    }
                }
            }
        }
        return result;
    }
    private getComponentChildren(nodeData: IVirtualElement): any {
        const children:IVirtualElement[] = [];
        nodeData.children && nodeData.children.map((tmpItem:IVirtualElement) => {
            if((tmpItem.tagName === "text" && !this.isEmpty(tmpItem.innerHTML)) || tmpItem.tagName !== "text") {
                children.push(tmpItem);
            }
        });
        return children;
    }
    private getUserComponentEvents(nodeData:IVirtualElement): any {
        const result = {};
        nodeData.events.map((tmpEvent:any) => {
            if(this.isFunction(tmpEvent.callBack)) {
                result[tmpEvent.eventName] = tmpEvent.callBack.bind(tmpEvent.handler.owner);
            }
        });
        return result;
    }

    /**
     * 绑定到自定义组件的方法,注意调用此方法时设置数据因为内存地址引用导致数据修改检查数据变化失败
     * 检查数据变化失败时设置refresh为true不做此限制
     * @param value:any
     * @param refresh:boolean 强制更新，不检查数据是否变化
     */
    private setComponentData(value:any, refresh?: boolean):void {
        const render = this;
        const myComponent = this.renderComponent;
        if (this.isObject(value)) {
            let dataChanged = refresh;
            if(!refresh) {
                // 强制更新时不需要检查数据是否不同，减少操作
                myComponent && Object.keys(value).map((cKey) => {
                    if(/props/i.test(cKey)) {
                        Object.keys(value[cKey]).map((propKey)=> {
                            if(JSON.stringify(value[cKey][propKey]) !== JSON.stringify(myComponent[cKey][propKey])) {
                                dataChanged = true;
                            }
                        });
                    } else {
                        if(JSON.stringify(value[cKey]) !== JSON.stringify(myComponent[cKey])) {
                            dataChanged = true;
                        }
                    }
                });
            }
            if(dataChanged && myComponent) {
                // 只有数据有变化才执行更新操作
                this.extend(myComponent, value);
                if(typeof render["render"] === "function") {
                    // tslint:disable-next-line: no-floating-promises
                    render["render"]();
                }
                this.isPropsChagneRefreshed = true;
            }
        } else {
            throw new Error("setData action get an wrong data,it\"s must be an object!");
        }
    }
    /**
     * 更新组件state,触发组件渲染过程
     * @param data 要更新的对象
     * @param refresh 是否强制触发组件重新渲染
     */
    private setComponentState(data: object, refresh?:boolean): void {
        const render = this;
        const myComponent = this.renderComponent;
        if (this.isObject(data)) {
            let dataChanged = refresh;
            if(!refresh && myComponent) {
                let oldState = myComponent.state || {};
                // 强制更新时不需要检查数据是否不同，减少操作
                for(const cKey of Object.keys(data)) {
                    if(JSON.stringify(data[cKey]) !== JSON.stringify(oldState[cKey])) {
                        dataChanged = true;
                        break;
                    }
                }
                oldState = null;
            }
            if(dataChanged && myComponent) {
                // 只有数据有变化才执行更新操作
                this.extend(myComponent.state, data);
                if(typeof render["render"] === "function") {
                    // tslint:disable-next-line: no-floating-promises
                    render["render"]();
                }
                this.isPropsChagneRefreshed = true;
            }
            dataChanged = null;
        } else {
            throw new Error("setState action get an wrong data,it\"s must be an object!");
        }
    }
    /**
     * 渲染svg元素属性
     * @param dom 渲染元素
     * @param domData dom虚拟结构数据
     * @param firstLevel 是否组件第一层
     */
    private renderSVGAttribute(dom:any, domData: IVirtualElement, firstLevel?: boolean):void {
        if(domData.status === VirtualElementOperate.APPEND || domData.status === VirtualElementOperate.UPDATE) {
            this.renderDomAttribute(<HTMLElement>dom, domData, firstLevel);
        }
    }
    private renderDomAttribute(dom: HTMLElement, domData: IVirtualElement, firstLevel?: boolean): void {
        try {
            if(dom && this.isFunction(dom.getAttribute)) {
                const isSVG = /^\[object\sSVG([a-zA-Z]*)Element\]$/.test(this.getType(dom));
                if(domData.props && (domData.status === VirtualElementOperate.APPEND || domData.status === VirtualElementOperate.UPDATE)) {
                    let hasVisibleCheck = false;
                    let hasVisibleCheckValue = null;
                    let lastCheckProps = {};
                    let hasClassValue = false;
                    const changeProps = domData.status === VirtualElementOperate.UPDATE ? domData.changeAttrs : domData.props;
                    if(this.uiOptions && this.uiOptions.isRSV) {
                        // add blow two attribute for position of the dom in user component
                        changeProps["data-rsv-class"] = this.renderComponent["selector"] || "Root";
                        changeProps["data-rsv-path"]  = domData.path.join("-");
                    }
                    const attrKeyList = changeProps ? Object.keys(changeProps) : [];
                    attrKeyList.map((attrKey: string) => {
                        const attrKeyValue = attrKey;
                        if(!/^\s*(show|em\:show)$\s*/i.test(attrKeyValue)) {
                            if(attrKeyValue !== "class") {
                                if(!/class\./.test(attrKey)) {
                                    if (!this.renderMiddleware.injectRenderDomAttribute(dom, {
                                        attrKey,
                                        attrValue: changeProps[attrKey],
                                        component: this.renderComponent,
                                        domData,
                                        render: this
                                    })) {
                                        if(!isSVG) {
                                            if(changeProps[attrKey] === undefined || changeProps[attrKey] === null) {
                                                dom.removeAttribute(attrKeyValue);
                                                // if tagName == a and href is empty then set javascript:void(0); to the attribute of href
                                                if(domData.tagName === "a" && /^href$/i.test(attrKey)) {
                                                    dom.setAttribute("href", "javascript:void(0);");
                                                }
                                            } else {
                                                if(domData.tagName !== "a" && !/^href$/i.test(attrKey)) {
                                                    dom.setAttribute(attrKeyValue, changeProps[attrKey]);
                                                } else {
                                                    if(!/^\s*javascript\:/i.test(changeProps[attrKey]) || /^\s*javascript\:\s*void\s*\(\s*[0]{0,1}\s*\)\s*\;\s*$/.test(changeProps[attrKey])) {
                                                        dom.setAttribute(attrKeyValue, changeProps[attrKey]);
                                                    } else {
                                                        // tslint:disable-next-line: no-console
                                                        console.error("Script code is not allowed for the href attribute!\r\n" + changeProps[attrKey]);
                                                    }
                                                }
                                            }
                                        } else {
                                            if(SvgConfig.xlinkAttributes.indexOf(attrKeyValue) > 0) {
                                                dom.setAttributeNS(SvgConfig.namespace.xlink,"xlink:" + attrKeyValue, changeProps[attrKey]);
                                            } else {
                                                dom.setAttribute(attrKeyValue, changeProps[attrKey]);
                                            }
                                        }
                                    }
                                } else {
                                    lastCheckProps[attrKey] = attrKeyValue;
                                    hasClassValue = true;
                                }
                            } else {
                                const classData:string = domData.props[attrKey] || "";
                                if(classData !== dom.className) {
                                    const classArr = classData.split(" ");
                                    if(classArr && classArr.length>0) {
                                        let tmpClass:string[] = [];
                                        classArr.map((tmpClassName: string) => {
                                            if(!this.isEmpty(tmpClassName)) {
                                                tmpClass.push(tmpClassName);
                                            }
                                        });
                                        let updateClassName:string = tmpClass.length>0 ? tmpClass.join(" ") : "";
                                        dom.setAttribute("class", updateClassName);
                                        updateClassName = null;
                                        tmpClass = null;
                                    }
                                }
                                hasClassValue = true;
                            }
                        } else {
                            hasVisibleCheck = true;
                            hasClassValue = true;
                            hasVisibleCheckValue = domData.props[attrKey];
                        }
                    });
                    // 放到最后做值修改，放在更新class属性时被覆盖掉
                    if(hasVisibleCheck) {
                        if(hasVisibleCheckValue) {
                            this.dom.removeClass(dom, "eui-display-none-imp");
                            this.dom.addClass(dom, "eui-display-block-imp");
                        } else {
                            this.dom.addClass(dom, "eui-display-none-imp");
                            this.dom.removeClass(dom, "eui-display-block-imp");
                        }
                    }
                    let tmpKeys = Object.keys(lastCheckProps);
                    if(tmpKeys.length>0) {
                        tmpKeys.map((tmpCheckKey: string) => {
                            const propsValue = domData.props[tmpCheckKey];
                            const propsKey = this.humpToStr(tmpCheckKey);
                            if(!this.renderMiddleware.injectRenderDomAttribute(dom, {
                                attrKey: tmpCheckKey,
                                attrValue: propsValue,
                                component: this.renderComponent,
                                domData,
                                render: this
                            })) {
                                if(!isSVG) {
                                    if(propsValue === undefined || propsValue === null) {
                                        dom.removeAttribute(propsKey);
                                    } else {
                                        dom.setAttribute(propsKey, propsValue);
                                    }
                                } else {
                                    dom.setAttributeNS(null,propsKey, propsValue);
                                }
                            }
                        });
                    }
                    tmpKeys = null;
                    lastCheckProps = null;
                    // 删除不存在的属性
                    const allPropsKeys = domData.props ? Object.keys(domData.props) : [];
                    for(let i=0,mLen=dom.attributes.length;i<mLen;i++) {
                        const tmpAttr = dom.attributes[i];
                        if(tmpAttr) {
                            const tmpAttrName = tmpAttr.name;
                            const isRemove = tmpAttrName === "class" ? !hasClassValue : true;
                            if(allPropsKeys.indexOf(tmpAttrName)<0 && isRemove) {
                                // 已经有的属性在新的dom结构中不存在，需要移除
                                !isSVG && dom.removeAttribute(tmpAttrName);
                                isSVG && dom.removeAttributeNS(null, tmpAttrName);
                                if(tmpAttrName === "checked" && /^input$/.test(domData.tagName)) {
                                    (<HTMLInputElement>dom).checked = false;
                                }
                            }
                        }
                    }
                }
            } else {
                // tslint:disable-next-line:no-console
                console.error("渲染dom属性失败：", domData.tagName, "Status: ", domData.status, "props:", domData.props, dom, domData);
            }
        } catch(e) {
            // tslint:disable-next-line:no-console
            console.error(e);
        }
    }
    /**
     * 将新创建的dom添加到目标dom树上
     * @param parent [HTMLElement] 添加到的父元素
     * @param dom [HTMLElement|Text|Comment] 当前dom
     * @param nodeData [IVirtualElement] 当前虚拟Dom数据
     * @param firstLevel [boolean] 是否第一层元素
     * @param position [number] 元素索引
     */
    private appendVirtualToDom(parent:HTMLElement,dom: HTMLElement|Text|Comment, nodeData: IVirtualElement, firstLevel?:boolean, position?: number): void {
        this.virtualDom.clear();
        this.virtualDom.init(nodeData);
        const before = this.getPrevDom(nodeData);
        if(firstLevel && position === 0 && this.isDOM(this.previousSibling)) {
            const next = this.previousSibling.nextSibling;
            if(next) {
                this.previousSibling.parentElement.insertBefore(dom, next);
            } else {
                /*
                * 当自定义组件第一次初始化的时候是拿不到自定义组件的下一个组件，还没有创建出来
                * 此时追加到parentElement最后，渲染当前组件同级的下一个组件时，应该append到当前自定义组件的最后一个组件
                */
                this.previousSibling.parentElement.appendChild(dom);
            }
        } else {
            if(!before) {
                if(parent.children.length>0) {
                    parent.insertBefore(dom, parent.firstChild);
                } else {
                    parent.appendChild(dom);
                }
            } else {
                const nextNode = (<any>before).nextSibling;
                if(nextNode) {
                    parent.insertBefore(dom, nextNode);
                } else {
                    parent.appendChild(dom);
                }
            }
        }
        nodeData.dom = dom;
    }
    private getAppendDom(nodeData:IVirtualElement, parent:HTMLElement, isSVG?: boolean): HTMLElement|Element|Comment {
        const rsvAttachDom = this.getValue(elmerData, "elmerState.renderOptions.rsvAttachDom");
        if(this.uiOptions && this.uiOptions.isRSV && !rsvAttachDom) {
            const uiPath = nodeData.path.join("-");
            const uiSelector = this.renderComponent["selector"] || "Root";
            const uiLength = parent.childNodes.length;
            if(uiLength > 0) {
                const innerHTML = (nodeData.innerHTML || "").replace(/^[\s\r\n]*/, "").replace(/[\s\r\n]*$/,"");
                for(let i=0;i<uiLength;i++) {
                    const tmpDom = parent.childNodes[i];
                    const tmpDomEle = <HTMLElement>tmpDom;
                    if(!/^#text$/i.test(tmpDom.nodeName) && tmpDomEle.tagName === nodeData.tagName.toUpperCase()) {
                        if(tmpDomEle.getAttribute("data-rsv-path") === uiPath && tmpDomEle.getAttribute("data-rsv-class") === uiSelector) {
                            return tmpDomEle;
                        }
                    } else {
                        const tmpNodeText = (tmpDom.nodeValue || "").replace(/^[\s\r\n]*/, "").replace(/[\s\r\n]*$/,"");
                        if(tmpNodeText === innerHTML && nodeData.tagName === "text") { // Only for tagName equal text virtualDom
                            return <HTMLElement>tmpDom;
                        }
                    }
                }
            } else {
                if(nodeData.tagName === "text") {
                    return <Element>parent.firstChild;
                }
            }
            // tslint:disable-next-line: no-console
            console.error(`nodeData not match dom element${nodeData.tagName}`, nodeData);
        } else {
            if(!this.isEmpty(nodeData.tagName) && !/^\<\!--/i.test(nodeData.tagName) && !/^text$/i.test(nodeData.tagName) && !/^content$/i.test(nodeData.tagName)) {
                if(!isSVG) {
                    return document.createElement(nodeData.tagName);
                } else {
                    return document.createElementNS(SvgConfig.namespace.svg, nodeData.tagName);
                }
            } else if(/^\<\!--/i.test(nodeData.tagName)) {
                return document.createComment(nodeData.innerHTML || "");
            } else if(/^text$/i.test(nodeData.tagName)) {
                return document.createTextNode(nodeData.innerHTML || "");
            }
        }
    }
    private getPrevDom(nodeData:IVirtualElement): HTMLElement|SVGSVGElement|Element|Text|Comment {
        this.virtualDom.clear();
        this.virtualDom.init(nodeData);
        const before = this.virtualDom.getPrev(this.nodeData);
        if(before) {
            if(before.tagAttrs && before.tagAttrs["isComponent"]) {
                const cpLastChild = before.tagAttrs["lastChild"];
                return this.isDOM(cpLastChild) ? cpLastChild : this.getPrevDom(before);
            } else {
                return before.dom ? before.dom : this.getPrevDom(before);
            }
        } else {
            return null;
        }
    }
    private getLastDom(nodeData:IVirtualElement): HTMLElement|SVGSVGElement|Element|Text|Comment {
        if(nodeData && nodeData.children) {
            for(let i=nodeData.children.length-1;i>=0;i--) {
                const tmpChild:IVirtualElement = nodeData.children[i];
                if(this.isDOM(tmpChild.dom)) {
                    return tmpChild.dom;
                }
            }
        }
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
                                this.virtualDom.init(checkItem);
                                this.virtualDom.replaceAt(children, i);
                                this.virtualDom.clear();
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
                                        this.virtualDom.init(checkItem);
                                        this.virtualDom.replaceAt(children[j].children, i);
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
    /**
     * 释放被标记为删除的节点
     */
    private deleteElements(nodeData:IVirtualElement): void {
        if(nodeData.deleteElements && nodeData.deleteElements.length>0) {
            nodeData.deleteElements.map((delItem:IVirtualElement) => {
                if(delItem.dom) {
                    this.dom.unbind(<HTMLElement>delItem.dom);
                    delItem.dom.parentElement && delItem.dom.parentElement.removeChild(delItem.dom);
                    // 删除DOM元素
                } else {
                    // 自定义组件需要通过render类的dispose方法释放
                    if(this.virtualDomList[delItem.virtualID]) {
                        this.virtualDomList[delItem.virtualID].render.dispose();  // 释放自定义组件内容
                        this.virtualDomList[delItem.virtualID].component = null;
                        this.virtualDomList[delItem.virtualID].render = null;
                        delete this.virtualDomList[delItem.virtualID];
                    }
                }
                delete nodeData.deleteElements;
                nodeData.deleteElements = [];
                this.releaseNodeDataChildren(delItem);
            });
        }
    }
    /**
     * 遇到删除的节点，释放节点子元素，从dom树移除，释放事件监听，自定义组件调用Render.dispose释放资源
     * @param nodeData 标记为删除状态的dom数据
     */
    private releaseNodeDataChildren(nodeData: IVirtualElement): void {
        if(nodeData.children && nodeData.children.length>0) {
            nodeData.children.map((delItem: IVirtualElement) => {
                delItem.status = "DELETE";
                if(delItem.dom) {
                    this.dom.unbind(<HTMLElement>delItem.dom);
                    delItem.dom.parentElement && delItem.dom.parentElement.removeChild(delItem.dom);
                    delItem.dom = null;
                    // 删除DOM元素
                } else {
                    // 自定义组件需要通过render类的dispose方法释放
                    if(this.virtualDomList[delItem.virtualID]) {
                        this.virtualDomList[delItem.virtualID].render.dispose();  // 释放自定义组件内容
                        this.virtualDomList[delItem.virtualID].component = null;
                        this.virtualDomList[delItem.virtualID].render = null;
                        delete this.virtualDomList[delItem.virtualID];
                    }
                }
                this.releaseNodeDataChildren(delItem);
            });
        }
    }
}
