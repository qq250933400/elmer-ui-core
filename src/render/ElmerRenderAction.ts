import { IVirtualElement } from "elmer-virtual-dom";
import { Component } from "../component/Component";
import { EventNames } from "../events/EventNames";
import { classNames } from "../lib/ElmerDom";
import utils from "../lib/utils";

export const XML_NL = "http://www.w3.org/2000/xmlns/";
export const SVG_NL = "http://www.w3.org/2000/svg";
export const SVG_ELE = ["a", "circle", "ellipse", "foreignObject", "g", "image", "line", "path", "polygon", "polyline", "rect", "svg", "text", "tspan", "use", "animate"];

type TypeCurrentRenderDispatch = {
    component: any;
    hookState: {
        hookIndex: number;
        state: any;
    },
    isFunc: Boolean;
};

export type TypeElmerRenderDispatchNodes = {
    vParent: IVirtualElement;
    vdom: IVirtualElement;
};

const renderDispatch = {
    current: null
};

const callLifeCycle = (component: any, methodName: keyof Component, ...args:any[]):void => {
    if(typeof component[methodName] === "function") {
        component[methodName].apply(component, args);
    }
};

const startRenderDispatch = (dispatchActions: any, renderCallback: Function): Promise<any> => {
    return new Promise<any>((resolve) => {
        if(!renderDispatch.current) {
            renderDispatch.current = dispatchActions;
            resolve(renderCallback());
            renderDispatch.current = null;
        } else {
            const timerTick = setInterval(() => {
                if(!renderDispatch.current) {
                    renderDispatch.current = dispatchActions;
                    resolve(renderCallback());
                    renderDispatch.current = null;
                    clearInterval(timerTick);
                }
            }, 10);
        }
    });
};

const getCurrentRenderDispatch = (): TypeCurrentRenderDispatch => renderDispatch.current;

const getPrevDom = (vdom:IVirtualElement, vdomParent:IVirtualElement): IVirtualElement|null => {
    const index = vdom.path[vdom.path.length - 1];
    const prevIndex = index - 1;
    const prevDom = vdomParent.children[prevIndex];
    if(prevDom) {
        if(prevDom.status !== "DELETE") {
            return prevDom;
        } else {
            return getPrevDom(prevDom, vdomParent);
        }
    }
};
const getNextDom = (vdom:IVirtualElement, vdomParent:IVirtualElement): IVirtualElement|null => {
    const index = vdom.path[vdom.path.length - 1];
    const nextIndex = index + 1;
    const nextDom = vdomParent.children[nextIndex];
    if(nextDom) {
        if(nextDom.status !== "DELETE") {
            return nextDom;
        } else {
            return getNextDom(nextDom, vdomParent);
        }
    }
};
const isTextNode = (dom: any): boolean => {
    return Object.prototype.toString.call(dom) === "[object Text]";
};
const createNodeByVdom = (vdom:IVirtualElement): HTMLElement|Text|Comment => {
    if(vdom.tagName === "text") {
        return document.createTextNode(vdom.innerHTML);
    } else if(/^<\!--$/.test(vdom.tagName)) {
        return document.createComment(vdom.innerHTML);
    } else {
        if(vdom.tagAttrs?.isSVG && SVG_ELE.indexOf(vdom.tagName.toLowerCase())>=0) {
            const xmlns = !utils.isEmpty(vdom.props.xmlns) ? vdom.props.xmlns : SVG_NL;
            return document.createElementNS(xmlns, vdom.tagName);
        } else {
            return document.createElement(vdom.tagName);
        }
    }
};
const renderAttr = (dom:HTMLElement, vdom:IVirtualElement): void => {
    if(vdom.tagName === "text") {
        dom.textContent = vdom.innerHTML;
    } else {
        const updateProps = vdom.status === "APPEND" ? vdom.props : vdom.changeAttrs;
        const isLink = /^(a)$/i.test(dom.tagName);
        if(updateProps) {
            const activeClassNames = classNames(vdom.props.class, vdom.props.className).replace(/\s{2,}/, " ").split(" ");
            let hasClassNameChange = false;
            Object.keys(updateProps).map((attrKey: string) => {
                const attrValue = updateProps[attrKey];
                const srcEventName = attrKey.replace(/^on/, "");
                if(/^on/.test(attrKey) && EventNames.indexOf(srcEventName) >= 0) {
                    // tslint:disable-next-line: no-console
                    console.error("事件监听请使用et:前缀设置，示例（et:click）");
                } else {
                    if(/^checked$/i.test(attrKey)) {
                        dom.setAttribute(attrKey, attrValue ? "checked" : null);
                        (dom as any).checked = attrValue;
                    } else if(/^show$/i.test(attrKey)) {
                        dom.style.display = attrValue ? "block" : "none";
                    } else if(/^iShow$/.test(attrKey)) {
                        dom.style.display = attrValue ? "inline-block" : "none";
                    } else if(/^href$/i.test(attrKey)) {
                        if(isLink) {
                            if(/^\s*javascript\s*\:/i.test(attrValue)) {
                                // tslint:disable-next-line: no-console
                                console.error("Script is not allowed in the hyperlink's attribute");
                            } else {
                                dom.setAttribute(attrKey, attrValue);
                            }
                        }
                    } else if(/^class\.[a-z0-9\-_]{1,}$/i.test(attrKey)) {
                        if(attrValue) {
                            activeClassNames.push(attrKey.replace(/^class\./i, ""));
                        }
                        hasClassNameChange = true;
                    } else if(/^(class|className)$/.test(attrKey)) {
                        hasClassNameChange = true;
                    } else {
                        dom.setAttribute(attrKey, attrValue);
                    }
                }
            });
            if(hasClassNameChange) {
                if(activeClassNames.length > 0) {
                    dom.setAttribute("class", activeClassNames.join(" "));
                } else {
                    // 当真实dom挂载有class而最新的虚拟节点没有className相关的数据时移除设置
                    if(!utils.isEmpty(dom.className)) {
                        dom.setAttribute("class", "");
                    }
                }
            }
        }
        if(isLink) {
            if(utils.isEmpty(vdom.props.href)) {
                dom.setAttribute("href", "javascript:void(0);");
            }
        }
        if(vdom.deleteAttrs) {
            for(const attrKey of vdom.deleteAttrs) {
                dom.removeAttribute(attrKey);
            }
        }
        if(/^svg$/i.test(vdom.tagName)) {
            if(vdom.status === "APPEND") {
                !vdom.props["xmlns:xlink"] && dom.setAttribute("xmlns:xlink", XML_NL);
            }
        }
    }
};

export default {
    callLifeCycle,
    createNodeByVdom,
    getCurrentRenderDispatch,
    getNextDom,
    getPrevDom,
    isTextNode,
    renderAttr,
    startRenderDispatch
};
