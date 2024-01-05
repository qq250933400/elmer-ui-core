import { utils } from "elmer-common";
import { ElmerAnimation, TypeAnimationChangeEvent, TypeElmerAnimationType } from "../animation/ElmerAnimation";
import animationMethod, { TypeAnimationProperty } from "../animation/ElmerAnimationProperty";
import { Service } from "../decorators";
import { EventNames } from "../events/EventNames";
import { ElmerDomQuery, IElmerDomSelector } from "./ElmerDomQuery";

type TypeAnimationOption = {
    type: TypeElmerAnimationType;
    from?: TypeAnimationProperty;
    to: TypeAnimationProperty;
    duration: number;
    beginTime?: number;
    dom:HTMLElement;
    optionA?: number;
    optionP?: number;
    optionS?: number;
    onStart?():void;
    onFinish?():void;
};

type TypeAnimationOptions = {
    duration: number;
    beginTime?: number;
    options: TypeAnimationOption[];
    onStart?():void;
    onFinish?():void;
};

type TypeAnimationParam = {[P in Exclude<keyof TypeAnimationOptions, "options">]?:TypeAnimationOptions[P]} & {
    type?: TypeElmerAnimationType
};

type TypeShowAnimationParam = TypeAnimationParam & { display?: string };

export interface IElmerDOM {
    supportCss3: boolean;
    attr(dom: HTMLElement|Node|Element, attrName: any, attrValue?: any):any;
    addClass(dom:HTMLElement|NodeList, className: String):void;
    byId(id:string, dom?: HTMLElement|null): Element|HTMLElement;
    contains(parent: HTMLElement | Element | Node, node: HTMLElement | Element | Node):Function;
    css(dom: NodeList|HTMLElement, key: any, value?: string|number): void;
    query(queryString: string, dom?: HTMLElement | Node): NodeList;
    width(dom: HTMLElement):number;
    height(dom: HTMLElement):number;
    on(dom: HTMLElement|NodeList, eventName:string, callBack:Function):void;
    removeClass(dom: HTMLElement|NodeList, className:string):void;
    removeEvent(dom: HTMLElement|NodeList, eventName: String, callBack?:Function):void;
    support(key:string):boolean;
}

export interface IElmerDOMEvent {
    eventName: string;
    handler: Function;
    listener?:EventListenerObject;
}

@Service
export class ElmerDOM extends ElmerDomQuery {
    bindEvents:string[] = EventNames;
    supportCss3: boolean = false;
    contains:Function;
    listener: any[] = [];

    constructor() {
        super();
        this.supportCss3 =this.support("transform");
        this.contains = document.documentElement !== null && document.documentElement.contains ?
        (parent:any, node:any)=> {
            return parent !== node && parent.contains(node);
        } :
        (parent:any, checkNode: any)=> {
            let node = checkNode;
            while(node && node.parentNode) {
                if(node === parent) {
                    return true;
                } else {
                    node = node.parentNode;
                }
            }
            return false;
        };
    }

    /**
     * 判断浏览器是否支持指定的css样式
     * @param {String} key css样式名称
     */
    support(key:string):boolean {
        const prefix = ["webkit","moz","ms","o"];
        if(!this.isEmpty(key)) {
            const prePropertyKey = key.substr(0,1).toUpperCase() + key.substr(1);
            for(let i=0;i<prefix.length;i++) {
                const myKey = prefix[i] + prePropertyKey;
                if(document.body && (<any>document.body.style)[myKey] !== undefined) {
                    return true;
                }
            }
            return document.body && (<any>document.body.style)[key] !== undefined;
        } else {
            return false;
        }
    }
    byId(id:string, dom?: HTMLElement|Element|null): Element|HTMLElement|null {
        if(this.isDOM(dom) && dom !== undefined && dom !== null) {
            return dom.querySelector("#"+id);
        } else {
            return document.getElementById(id);
        }
    }
    query(queryString: string, dom?: HTMLElement | null): NodeList {
        if(this.isDOM(dom) && dom !== undefined && dom !== null ) {
            return dom.querySelectorAll(queryString) || new NodeList();
        } else {
            return document.querySelectorAll(queryString) || new NodeList();
        }
    }
    width(dom: HTMLElement):number {
        return this.isDOM(dom) ? dom.clientWidth : 0;
    }
    height(dom: HTMLElement):number {
        return this.isDOM(dom) ? dom.clientHeight : 0;
    }
    css(dom: NodeList|HTMLElement|HTMLElement[], key: any, value?: string|number): void {
        if(this.isDOM(dom)) {
            this.setCss(dom, key, value);
        } else if(this.getType(dom) === "[object NodeList]" || this.getType(dom) === "[object Array]") {
            (<NodeList>dom).forEach((tmpDom:HTMLElement) => {
                this.setCss(tmpDom, key,value);
            });
        }
    }
    setCss(dom:HTMLElement, key: any, value?: string|number): void {
        if(dom) {
            if(this.isString(key)) {
                if((<any>dom)["style"][key] !== undefined) {
                    const cssValue: string = <string>(this.isNumeric(value) && key !== "opacity" ? value + "px" : value);
                    dom.style.setProperty(key, cssValue);
                }
            } else if(this.isObject(key)) {
                for(const csskey in key) {
                    if(!this.isEmpty(key[csskey])) {
                        const convertCssKeys = ["left", "top", "right", "bottom", "width", "height", "fontSize",
                            "borderWidth","borderLeftWidth","borderTopWidth", "borderRightWidth","borderBottomWidth",
                            "marginLeft", "marginTop", "marginRight", "marginBottom", "paddingLeft", "paddingTop", "paddingRight", "paddingBottom"];
                        const setCssValue: string = <string>(this.isNumeric(key[csskey]) && convertCssKeys.indexOf(csskey) >= 0 ? key[csskey] + "px" : key[csskey]);
                        dom.style.setProperty(this.humpToStr(csskey), setCssValue);
                    } else {
                        dom.style.setProperty(this.humpToStr(csskey), null);
                    }
                }
            }
        }
    }
    setCss3(dom:HTMLElement, key: string, value?:string|number): void {
        if(!this.isEmpty(key)) {
            const profillKey = key.substr(0,1).toUpperCase() + key.substr(1);
            this.setCss(dom, key, value);
            this.setCss(dom, "webkit" + profillKey, value);
            this.setCss(dom, "moz" + profillKey, value);
            this.setCss(dom, "ms" + profillKey, value);
            this.setCss(dom, "o" + profillKey, value);
        }
    }
    getCss3(key: string,value: string): string {
        const calcReg = /^calc\(/i;
        const supportPrefix = ["webkit","moz","ms","o"];
        let result = "";
        if(calcReg.test(value)) {
            supportPrefix.map((tmpPrefix: string) => {
                result += `${key}:-${tmpPrefix}-${value};`;
            });
            result += `${key}:${value}`;
        } else {
            supportPrefix.map((tmpPrefix: string) => {
                result += `-${tmpPrefix}-${key}:${value};`;
            });
            result += `${key}:${value};`;
        }
        return result;
    }
    hasClass(dom:HTMLElement, className: string): boolean {
        if(this.isDOM(dom)) {
            if(dom.classList && dom.classList.contains) {
                return dom.classList.contains(className);
            } else {
                const tmpClassName = (dom.className || "").replace(/\s\s/g," ");
                const tmpClassArr = tmpClassName.split(" ");
                return tmpClassArr.indexOf(className) >=0;
            }
        }
    }
    attr(dom: HTMLElement|Node|Element, attrName: any, attrValue?: any): any {
        if(this.isDOM(dom)) {
            if(attrValue !== undefined) {
                dom.setAttribute(attrName, attrValue);
            } else {
                if(!this.isObject(attrName)) {
                    const v:string|null = dom.getAttribute(attrName);
                    return this.isNumeric(v) && v !==null ? ((v as string).indexOf(".")<0 ? parseInt(v, 10) : parseFloat(v)) : v;
                } else {
                    Object.keys(attrName).forEach((tmpAttrName: string) => {
                        dom.setAttribute(tmpAttrName, attrName[tmpAttrName]);
                    });
                }
            }
        }
    }
    addClass(dom:HTMLElement|NodeList|HTMLElement[], className: string): void {
        if(this.isDOM(dom) && !this.isEmpty(className)) {
            this.updateDomClassName(dom, className, true);
        } else if(this.getType(dom) === "[object NodeList]" || this.getType(dom) === "[object Array]") {
            const domList:NodeList = (<NodeList>dom);
            domList.forEach((item:Node)=> {
                this.updateDomClassName(<HTMLElement>item, className, true);
            });
        }
    }
    removeClass(dom: HTMLElement|NodeList|HTMLElement[], className:string):void {
        if(this.getType(dom) === "[object NodeList]" || this.getType(dom) === "[object Array]") {
            (<NodeList>dom).forEach((item: Node)=> {
                this.updateDomClassName(<HTMLElement>item, className, false);
            });
        } else {
            this.updateDomClassName(<HTMLElement>dom, className, false);
        }
    }
    on(dom:any | HTMLElement, eventName:string, callBack:Function, options?: AddEventListenerOptions):void {
        this.addEvent(dom, eventName, callBack, options);
    }
    addEvent(dom: any | HTMLElement, eventName: string, callBack: Function, options?: AddEventListenerOptions): void {
        if(this.isDOM(dom) || this.getType(dom) === "[object Window]") {
            const eventListener:IElmerDOMEvent[] = (<any>dom).eventListeners || [];
            const profillEventName = "on" + eventName;
            const eventData:IElmerDOMEvent = {
                eventName,
                handler: callBack
            };
            if(this.bindEvents.indexOf(eventName)>=0) {
                // 使用addEventListener方法绑定事件
                if(dom.addEventListener) {
                    if(options) {
                        (<any>dom).addEventListener(eventName, callBack, options);
                    } else {
                        (<any>dom).addEventListener(eventName, callBack);
                    }
                } else {
                    if(options) {
                        (<any>dom).attachEvent(profillEventName, callBack, options);
                    } else {
                        (<any>dom).attachEvent(profillEventName, callBack);
                    }
                }
            } else {
                // 特殊事件直接绑定
                if(dom[eventName]) {
                    dom[eventName] = callBack;
                } else {
                   dom[profillEventName] = callBack;
                }
            }
            eventListener.push(eventData);
            (<any>dom).eventListeners = eventListener;
        }
    }
    removeEvent(dom:any | HTMLElement, eventName:string, callBack: Function, options?: any):void {
        if(this.isDOM(dom)) {
            const eventListeners:IElmerDOMEvent[] = (<any>dom).eventListeners || [];
            if(eventListeners && eventListeners.length>0) {
                eventListeners.map((tmpListener:IElmerDOMEvent,index: number) => {
                    if(tmpListener.eventName === eventName && callBack === tmpListener.handler ) {
                        if(this.bindEvents.indexOf(tmpListener.eventName)>=0) {
                            if(dom.removeEventListener) {
                                (<any>dom).removeEventListener(tmpListener.eventName,tmpListener.handler);
                            } else {
                                if((<any>dom).detachEvent) {
                                    (<any>dom).detachEvent("on" + tmpListener.eventName, tmpListener.handler);
                                }
                            }
                        } else {
                            (<any>dom)[tmpListener.eventName] = null;
                        }
                        delete eventListeners[index];
                    }
                });
                (<any>dom).eventListeners = eventListeners;
            } else {
                if(dom.removeEventListener) {
                    dom.removeEventListener(eventName, <any>callBack, options);
                } else if((<any>dom).detachEvent) {
                    (<any>dom).detachEvent("on" + eventName, callBack, options);
                }
            }
        }
    }
    unbind(dom: HTMLElement): void {
        if(this.isDOM(dom)) {
            const eventListeners:IElmerDOMEvent[] = (<any>dom).eventListeners || [];
            eventListeners.map((tmpListener:IElmerDOMEvent,index: number) => {
                if(this.bindEvents.indexOf(tmpListener.eventName)>=0) {
                    if(dom.removeEventListener) {
                        (<any>dom).removeEventListener(tmpListener.eventName,tmpListener.handler);
                    } else {
                        if((<any>dom).detachEvent) {
                            (<any>dom).detachEvent("on" + tmpListener.eventName, tmpListener.handler);
                        }
                    }
                }
                delete eventListeners[index];
            });
            (<any>dom).eventListeners = null;
        }
    }
    getMaxWidth(domList:HTMLElement[]|NodeList): number {
        let maxWidth = 0;
        if(domList) {
            if(this.isNodeList(domList)) {
                domList.forEach((tmpDom:HTMLElement) => {
                    let tmpWidth = tmpDom.clientWidth;
                    if(tmpWidth>maxWidth) {
                        maxWidth = tmpWidth;
                    }
                    tmpWidth = null;
                });
            } else {
                domList.map((tmpDom:HTMLElement) => {
                    let tmpWidth = tmpDom.clientWidth;
                    if(tmpWidth>maxWidth) {
                        maxWidth = tmpWidth;
                    }
                    tmpWidth = null;
                });
            }
        }
        return maxWidth;
    }
    find(dom:HTMLElement, selector: string): HTMLElement[] {
        const regs:IElmerDomSelector[] = this.getSelectors(selector) || [];
        const result:HTMLElement[] = [];
        regs.map((tmpSelector:IElmerDomSelector) => {
            const tmpDoms = this.queryInDom(dom, tmpSelector);
            if(tmpDoms.length>0) {
                result.push(...tmpDoms);
            }
        });
        return result;
    }
    animation(options:TypeAnimationOption): ElmerAnimation {
        if(this.isDOM(options.dom)) {
            return new ElmerAnimation({
                beginTime: options.beginTime,
                data: [{
                    beginTime: options.beginTime,
                    dom: options.dom,
                    duration: options.duration,
                    from: options.from,
                    onFinish: options.onFinish,
                    onStart: options.onStart,
                    to: options.to,
                    type: options.type || "Linear"
                }],
                duration: options.duration,
                onChange: this.onAnimationChange.bind(this)
            });
        } else {
            throw new Error("Animation dom must be an HtmlElement");
        }
    }
    animations(animationData: TypeAnimationOptions):ElmerAnimation {
        return new ElmerAnimation({
            beginTime: animationData.beginTime,
            data: animationData.options,
            duration: animationData.duration,
            onBegin: animationData.onStart,
            onChange: this.onAnimationChange.bind(this),
            onEnd: animationData.onFinish
        });
    }
    show(dom:HTMLElement, options?: TypeAnimationParam): void {
        const nDuration = options ? options.duration || 300 : 300;
        this.css(dom, {
            display: "",
            opacity: 0
        });
        this.animation({
            dom,
            duration: nDuration,
            from: {
                opacity: 0
            },
            to: {
                opacity: 1
            },
            type: options && !this.isEmpty(options.type) ? options.type : "Linear",
            // tslint:disable-next-line: object-literal-sort-keys
            onStart: options ? options.onStart : null,
            onFinish: (): void => {
                this.css(dom, {
                    display: "",
                    opacity: 1
                });
                options && typeof options.onFinish === "function" && options.onFinish();
            }
        });
    }
    hide(dom:HTMLElement, options?: TypeAnimationParam): void {
        const nDuration = options ? options.duration || 300 : 300;
        this.css(dom, {
            display: "",
            opacity: 1
        });
        // tslint:disable: object-literal-sort-keys
        this.animation({
            dom,
            duration: nDuration,
            from: {
                opacity: 1
            },
            to: {
                opacity: 0
            },
            type: options && !this.isEmpty(options.type) ? options.type : "Linear",
            onStart: options ? options.onStart : null,
            onFinish: (): void => {
                this.css(dom, {
                    display: "none",
                    opacity: 1
                });
                options && typeof options.onFinish === "function" && options.onFinish();
            }
        });
        // tslint:enable: object-literal-sort-keys
    }
    slideIn(dom:HTMLElement, options?: TypeShowAnimationParam): void {
        let attrHeight = this.attr(dom, "data-animation-height") || "";attrHeight = attrHeight.replace(/[a-z]*$/i, "").replace(/\%/g,"");
        let attrHeightValue = /^[0-9\.]{1,}$/.test(attrHeight) ? attrHeight : 0;
        let domHeight:number = attrHeightValue > 0 ? attrHeightValue : dom.clientHeight;
        let from:TypeAnimationProperty = {
            height: 0,
            opacity: 1
        };
        let to:TypeAnimationProperty = {
            height: domHeight,
            opacity: 1
        };
        let dValue = animationMethod.converAnimationProperty(animationMethod.readWillChangeCssDefaultData(dom, from, to));
        this.css(dom, {
            display: options && !this.isEmpty(options.display) ? options.display : "",
            opacity: "1",
        });
        if(to.height === 0) {
            to.height = dom.clientHeight;
        }
        this.css(dom, "height", 0);
        this.animation({
            dom,
            duration: options ? (options.duration || 300) : 300,
            from,
            to,
            type: options ? options.type : "Linear",
            // tslint:disable-next-line: object-literal-sort-keys
            onFinish: () => {
                this.css(dom, {
                    height: dValue?.height,
                    opacity: 1
                });
                options && typeof options.onFinish === "function" && options.onFinish();
            }
        });
        dValue = null;
        to = null;
        from = null;
        domHeight = null;
        attrHeightValue = null;
    }
    slideOut(dom:HTMLElement, options?: TypeShowAnimationParam): void {
        const domHeight:number = dom.clientHeight;
        const from:TypeAnimationProperty = {
            height: domHeight,
            opacity: 1
        };
        const to:TypeAnimationProperty = {
            height: 0,
            opacity: 0.5
        };
        const dValue = animationMethod.converAnimationProperty(animationMethod.readWillChangeCssDefaultData(dom, from, to));
        this.animation({
            dom,
            duration: options ? (options.duration || 300) : 300,
            from,
            to,
            type: options ? options.type : "Linear",
            // tslint:disable-next-line: object-literal-sort-keys
            onFinish: () => {
                this.css(dom, {
                    display: "none",
                    opacity: 1,
                    // tslint:disable-next-line: object-literal-sort-keys
                    height: dValue.height
                });
                this.attr(dom, "data-animation-height", dValue.height);
                options && typeof options.onFinish === "function" && options.onFinish();
            }
        });
    }
    private onAnimationChange(evt:TypeAnimationChangeEvent): void {
        // console.log(evt.value);
        this.css(evt.dom, evt.value);
    }
    private queryInDom(dom:HTMLElement, selector:IElmerDomSelector): HTMLElement[] {
        let resultDoms:HTMLElement[] = [];
        if(selector.mode === ">") {
            // 查询当前节点的第一级子节点
            dom.childNodes.forEach((tmpChildNode:Node, index:number) => {
                if(this.matchQueryNode(<HTMLElement>tmpChildNode, selector.type, selector.value, index)) {
                    if(selector.child) {
                        let tmpChildDoms:HTMLElement[] = this.queryInDom(<HTMLElement>tmpChildNode, selector.child);
                        if(tmpChildDoms && tmpChildDoms.length>0) {
                            resultDoms.push(...tmpChildDoms);
                        }
                        tmpChildDoms = null;
                    } else {
                        resultDoms.push(<HTMLElement>tmpChildNode);
                    }
                }
            });
        } else if(selector.mode === "+") {
            // 查询和当前同一级，第一个出现的节点
            let nextElement = this.getNextSilbingElement(dom,selector.type, selector.value);
            if(nextElement) {
                if(selector.child) {
                    resultDoms = this.queryInDom(nextElement, selector.child);
                } else {
                    resultDoms = [nextElement];
                }
                nextElement = null;
            }
        } else if(this.isEmpty(selector.mode)) {
            let tmpElements:HTMLElement[] = null;
            let tmpResult = this.getElementsBySelectValue(dom, selector.type, selector.value);
            let filterType= tmpResult.filterType;
            let filter    = tmpResult.filter;
            tmpElements = tmpResult.elements;
            if(tmpElements && tmpElements.length>0) {
                tmpElements.forEach((tmpElement: HTMLElement) => {
                    if(filterType === ".") {
                        if(this.hasClass(tmpElement, filter)) {
                            if(selector.child) {
                                resultDoms.push(...this.queryInDom(tmpElement, selector.child));
                            } else {
                                resultDoms.push(tmpElement);
                            }
                        }
                    } else if(filterType === ":") {
                        // 暂不支持，先完成基本组件功能，以后在升级， 此处使用插件模式做判断，以便于扩展判断条件
                        // if(this.mDomModel.filterCheck(tmpElement, filter)) {
                        //     if(selector.child) {
                        //         resultDoms.push(...this.queryInDom(tmpElement, selector.child));
                        //     } else {
                        //         resultDoms.push(tmpElement);
                        //     }
                        // }
                    } else if(this.isEmpty(filterType)) {
                        if(selector.child) {
                            resultDoms.push(...this.queryInDom(tmpElement, selector.child));
                        } else {
                            resultDoms.push(tmpElement);
                        }
                    }
                });
            }
            tmpResult = null;
            tmpElements = null;
            filter = null;
            filterType = null;
        }
        return resultDoms;
    }
    private getElementsBySelectValue(parent:HTMLElement, selectorType: string, selectorValue: string): any {
        let tagName = selectorValue.replace(/(\.|\:|\:\:).*$/,"");
        let filter  = /^.*(\.|\:|\:\:)/.test(selectorValue) ? selectorValue.replace(/^.*(\.|\:|\:\:)/,"") : "";
        let filterType = selectorValue.substr(tagName.length, selectorValue.length-tagName.length-filter.length);
        const result:HTMLElement[] = [];
        if(this.isEmpty(selectorType)) {
            parent.querySelectorAll(tagName).forEach((tmpElement) => {
                result.push(<HTMLElement>tmpElement);
            });
        } else if(selectorType === "." || selectorType === "#") {
            parent.querySelectorAll("*").forEach((tmpElement:HTMLElement) => {
                if(selectorType === ".") {
                    if(this.hasClass(tmpElement, tagName)) {
                        result.push(tmpElement);
                    }
                } else if(selectorType === "#") {
                    if(tmpElement.id === tagName) {
                        result.push(tmpElement);
                    }
                }
            });
        }
        tagName = null;
        filter = null;
        filterType = null;
        return {
            elements  : result || [],
            filter,
            filterType,
        };
    }
    private getNextSilbingElement(dom: HTMLElement,queryType:string, querySelector: string):HTMLElement {
        const nextElement = dom.nextElementSibling;
        if(nextElement) {
            if(this.matchQueryNode(<HTMLElement>nextElement, queryType, querySelector, 0)) {
                return <HTMLElement>nextElement;
            } else {
                return this.getNextSilbingElement(<HTMLElement>nextElement,queryType, querySelector);
            }
        }
        return null;
    }
    private matchQueryNode(dom:HTMLElement, queryType: string, querySelector: string, index: number = 0): boolean {
        const tmpReg = /^([a-z0-9][a-z0-9\-_]*)/;
        const tmpMatch = querySelector.match(tmpReg);
        if(tmpMatch) {
            const checkValue = tmpMatch[1];
            if(this.isEmpty(queryType)) {
                return dom.tagName.toLowerCase() === checkValue.toLowerCase();
            } else if(queryType === ".") {
                return this.hasClass(dom, checkValue);
            } else if(queryType === "#") {
                return dom.id === checkValue;
            }
        }
        return false;
    }
    /**
     * 更新dom的className，此写法为兼容低版本不支持classList
     * @param dom 更新dom元素
     * @param className 样式名
     * @param isAdd 是否为添加，否则删除
     */
    private updateDomClassName(dom:HTMLElement, className: string, isAdd: boolean): void {
        if(this.isDOM(dom) && !this.isEmpty(className)) {
            if(dom.classList) {
                if(isAdd) {
                    !dom.classList.contains(className) && dom.classList.add(className);
                } else {
                    dom.classList.contains(className) && dom.classList.remove(className);
                }
            } else {
                const tmpClassName = (dom.className || "").replace(/\s\s/g, " ");
                let tmpClassArr = tmpClassName.split(" ");
                let hasChanged = false;
                const tmpClassIndex = tmpClassArr.indexOf(className);
                if(isAdd) {
                    if(tmpClassIndex<0) {
                        tmpClassArr.push(className);
                        hasChanged = true;
                    }
                } else {
                    if(tmpClassIndex>0) {
                        const newClassArr = [];
                        for(let i=0;i<tmpClassArr.length;i++) {
                            if(tmpClassArr[i] !== className && !this.isEmpty(tmpClassArr[i])) {
                                newClassArr.push(tmpClassArr[i]);
                            } else {
                                hasChanged = true;
                            }
                        }
                        tmpClassArr = newClassArr;
                    }
                }
                if(hasChanged) {
                    dom.className = tmpClassArr.join(" ");
                }
            }
        }
    }
}

// tslint:disable-next-line: only-arrow-functions
export const classNames = function(...argsList: Array<string|undefined|null>):string {
    const list = [];
    for(let i=0;i<argsList.length;i++) {
        if(utils.isString(argsList[i]) && !utils.isEmpty(argsList[i])) {
            list.push(argsList[i]);
        }
    }
    return list.join(" ");
};
