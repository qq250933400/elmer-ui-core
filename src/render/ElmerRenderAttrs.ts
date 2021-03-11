import { StaticCommon as utils } from "elmer-common";
import { IVirtualElement } from "elmer-virtual-dom";
import { injectable } from "../inject/injectable";

export const XML_NL = "http://www.w3.org/2000/xmlns/";
export const SVG_NL = "http://www.w3.org/2000/svg";
export const SVG_ELE = ["a", "circle", "ellipse", "foreignObject", "g", "image", "line", "path", "polygon", "polyline", "rect", "svg", "text", "tspan", "use"];

@injectable("ElmerRenderAttrs")
export class ElmerRenderAttrs {
    /**
     * 渲染dom属性值
     * @param dom 真实dom节点
     * @param vdom 虚拟dom节点
     */
    render(dom:HTMLElement, vdom:IVirtualElement): void {
        if(vdom.tagName === "text") {
            dom.textContent = vdom.innerHTML;
        } else {
            const updateProps = vdom.status === "APPEND" ? vdom.props : vdom.changeAttrs;
            const isLink = /^(a)$/i.test(dom.tagName);
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
                    } else if(/^href$/i.test(attrKey)) {
                        if(isLink) {
                            if(/^\s*javascript\s*\:/i.test(attrValue)) {
                                throw new Error("Script is not allowed in the hyperlink's attribute");
                            } else {
                                dom.setAttribute(attrKey, attrValue);
                            }
                        }
                    } else {
                        dom.setAttribute(attrKey, attrValue);
                    }
                });
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
    }
}