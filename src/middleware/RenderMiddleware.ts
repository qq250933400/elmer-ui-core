import { Common } from "elmer-common";
import { IVirtualElement } from "elmer-virtual-dom";
import { ElmerDOM } from "../core/ElmerDom";
import { Injectable } from "../inject";
import { autowired } from "../inject/injectable";
import { IRenderAttributeOptions } from "../interface/IRenderMiddleware";

export interface IVirtualRenderLogincOption {
    attrKey: string;
    attrValue: any;
    optionData: any;
}
/**
 * 渲染插件，在插入开发第三方解析插件注入
 */
@Injectable("RenderMiddleware")
export class RenderMiddleware extends Common {
    private svgAttrNameSpace: string = null;

    @autowired(ElmerDOM)
    private $:ElmerDOM;
    /**
     * 渲染dom属性扩展
     * @param dom 渲染dom元素
     * @param attrKey 属性名称
     * @param attrValue 属性值
     * @param domData 虚拟dom数据
     */
    injectRenderDomAttribute(dom: HTMLElement,options: IRenderAttributeOptions): boolean {
        if(dom) {
            const attrKey: string = options.attrKey, attrValue: any = options.attrValue, domData: IVirtualElement = options.domData;
            const isSVG = this.isSVGDOM(dom);
            if(domData.tagName === "input" && (/checkbox/.test(domData.props.type) || /radio/.test(domData.props.type))) {
                if(attrKey === "checked") {
                    if((/\s*(true|1)\s*/i.test(attrValue) || /\s*(false|0)\s*/i.test(attrValue))) {
                        if(/\s*(true|1)\s*/i.test(attrValue)) {
                            dom.setAttribute(attrKey, "checked");
                            (<HTMLInputElement>dom).checked = true;
                        } else {
                            dom.removeAttribute(attrKey);
                            (<HTMLInputElement>dom).checked = false;
                        }
                    } else if(/checked/i.test(attrValue) || this.isEmpty(attrValue)) {
                        if(this.isEmpty(attrValue)) {
                            dom.removeAttribute(attrKey);
                            (<HTMLInputElement>dom).checked = false;
                        } else {
                            dom.setAttribute(attrKey, "checked");
                            (<HTMLInputElement>dom).checked = true;
                        }
                    }
                    return true;
                }
            }
            if(/^class\.[a-z0-9\-_]*$/i.test(attrKey)) {
                const myClassName = attrKey.replace(/^class\./,"");
                if(attrValue) {
                    this.$.addClass(dom, myClassName);
                } else {
                    this.$.removeClass(dom, myClassName);
                }
                return true;
            } else if(/^disabled$/.test(attrKey)) {
                if(this.isString(attrValue) && (/\s*(true|1)\s*/i.test(attrValue) || /\s*(false|0)\s*/i.test(attrValue))) {
                    if(/\s*(true|1)\s*/i.test(attrValue)) {
                        !isSVG && dom.setAttribute(attrKey, "disabled");
                        isSVG && dom.setAttributeNS(this.svgAttrNameSpace,attrKey, "disabled");
                    } else {
                        !isSVG && dom.removeAttribute(attrKey);
                        isSVG && dom.removeAttributeNS(this.svgAttrNameSpace,attrKey);
                    }
                } else if(typeof attrValue === "boolean") {
                    if(attrValue) {
                        !isSVG && dom.setAttribute(attrKey, "disabled");
                        isSVG && dom.setAttributeNS(this.svgAttrNameSpace,attrKey, "disabled");
                    } else {
                        !isSVG && dom.removeAttribute(attrKey);
                        isSVG && dom.removeAttributeNS(this.svgAttrNameSpace,attrKey);
                    }
                }
                return true;
            } else if(/^tabindex$/i.test(attrKey)) {
                dom.tabIndex = attrValue;
                return true;
            } else if(/^(id|name|style|class)$/i.test(attrKey)) {
                return this.isEmpty(attrValue);
            }
        }
        return false;
    }
    virtualRenderLogic(domComponent: any, options:IVirtualRenderLogincOption, saveResult: object): boolean {
        const resultAttrKey = options.attrKey.replace(/^[a-z]*:/i, "");
        let exMessage = "";
        try {
            let checkValue = options.attrValue || "";
            checkValue = checkValue.replace(/\s*\{\{/, "").replace(/\}\}\s*/, "");

            if(/\s(eq|neq|gt|lt|gteq|lteq|\&\&|\|\|)\s/.test(checkValue)) {
                const attrValue = checkValue || "";
                const varArr = attrValue.split(/\s+/);
                const logicData = {};
                const checkLogic = [];
                let logicCode= "";
                for(let i=0;i<varArr.length;i++) {
                    const tmpVar = varArr[i];
                    const lenLogic = /\.length$/.test(tmpVar); // 针对常用判断中取数组长度，取数组长度使用getValue会取不到值
                    const noneLogic = /^\!/.test(tmpVar);
                    const dataKey = tmpVar.replace(/^\!/,"").replace(/^this\./, "").replace(/\.length$/, "");
                    const domData = this.getValue(domComponent, dataKey);
                    const tmpData = !this.isEmpty(domData) ? domData : this.getValue(options.optionData, dataKey);
                    let saveKey = dataKey.replace(/\./g,"");
                    saveKey = lenLogic ? saveKey+ "length" : saveKey;
                    if(!this.isEmpty(tmpData)) {
                        logicData[saveKey] = lenLogic ? tmpData["length"] : tmpData;

                        if(!noneLogic) {
                            checkLogic.push(`logicData.${saveKey}`);
                        } else {
                            checkLogic.push(`!logicData.${saveKey}`);
                        }
                    } else {
                        if(!/\./.test(tmpVar)) {
                            checkLogic.push(tmpVar);
                        } else {
                            if(!noneLogic) {
                                checkLogic.push(`logicData.${saveKey}`);
                            } else {
                                checkLogic.push(`!logicData.${saveKey}`);
                            }
                        }
                    }
                }

                logicCode = checkLogic.join(" ");
                logicCode = logicCode.replace(/\s(eq)\s/g," === ");
                logicCode = logicCode.replace(/\s(neq)\s/g," !== ");
                logicCode = logicCode.replace(/\s(gt)\s/g," > ");
                logicCode = logicCode.replace(/\s(lt)\s/g," < ");
                logicCode = logicCode.replace(/\s(gteq)\s/g," >= ");
                logicCode = logicCode.replace(/\s(lteq)\s/g," <= ");
                exMessage = logicCode;
                let fn = new Function("logicData", "return " + logicCode);
                saveResult[resultAttrKey] = fn(logicData);
                fn = null;
                return true;
            }
            exMessage = null;
            return false;
        } catch (e) {
            // tslint:disable-next-line:no-console
            console.error(e, exMessage);
            return true;
        }
    }
    virtualRenderBindText(domComponent: any, text: string, optionData: any): any {
        let staticReg = /\s*\{\{\s*([\!a-z0-9\-_.]*)\(([a-z0-9\-_.,"']*)\s*\)\}\}\s*/i;
        if(!this.isEmpty(text)) {
            let execText = text;
            let staticMatch = execText.match(staticReg);
            while(staticMatch) {
                let execKey = staticMatch[1];
                let execParam = staticMatch[2];
                let exec = this.getValue(domComponent, execKey);
                exec = typeof exec === "function" ? exec : this.getValue(optionData, execKey);
                if(typeof exec === "function") {
                    if(!this.isEmpty(execParam)) {
                        let execParamArr = execParam.split(",");
                        let execArr = [];
                        execParamArr.map((tmpVar: any) => {
                            if(this.isString(tmpVar) && isNaN(<any>tmpVar)) {
                                if((/^\"/.test(tmpVar) && /\"$/.test(tmpVar)) || (/^\'/.test(tmpVar) && /\'$/.test(tmpVar))) {
                                    const myVar = tmpVar.replace(/^\"/,"").replace(/\"$/,"").replace(/^\'/,"").replace(/\'$/,"");
                                    execArr.push(myVar);
                                } else {
                                    let tmpParam = this.getValue(domComponent, tmpVar);
                                    tmpParam = tmpParam !== undefined ? tmpParam : this.getValue(optionData, tmpVar);
                                    execArr.push(this.val(tmpParam));
                                }
                            } else {
                                execArr.push(this.val(tmpVar));
                            }
                        });
                        execText = execText.replace(staticMatch[0], exec.apply(domComponent, execArr));
                        execParamArr = null;
                        execArr = null;
                    } else {
                        execText = execText.replace(staticMatch[0], exec());
                    }
                } else {
                    // 满足执行方法自定义变量，查找不到执行方法清除{{ }}符号破坏标记防止重复执行
                    execText = execText.replace(staticMatch[0], staticMatch[0].replace(/^\s*\{\{/, "").replace(/\}\}\s*$/,""));
                }
                execKey = null;
                execParam = null;
                staticMatch = execText.match(staticReg);
            }
            staticMatch = null;
            return execText;
        }
        staticReg = null;
    }
}
