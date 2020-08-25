import { Common } from "elmer-common";
import { IHtmlNodeEventData, IVirtualElement, VirtualElement  } from "elmer-virtual-dom";
import { autowired, Injectable } from "../inject";
import { RenderMiddleware } from "../middleware/RenderMiddleware";
import { IElmerEvent } from "./IElmerInterface";

type VirtualNodeData = {
    attrs?: any;
    events?:IHtmlNodeEventData[],
    dataSet?: any;
};

@Injectable("ElmerVirtualRender")
export class ElmerVirtualRender extends Common {
    renderComponent: any;
    nodeData: IVirtualElement;
    debug: boolean = false;
    @autowired(VirtualElement)
    virtualDom:VirtualElement;
    @autowired(RenderMiddleware)
    private renderMiddelware: RenderMiddleware;
    constructor() {
        super();
    }
    setComponentData(component:any, virtualDomData: IVirtualElement): void {
        this.renderComponent = component;
        this.nodeData = virtualDomData;
    }
    render(): IVirtualElement {
        if(this.nodeData && this.nodeData.children && this.nodeData.children.length>0) {
            this.renderRepeat(this.nodeData);
            this.renderAttribute(this.nodeData);
            this.debug = false;
        }
        return this.nodeData;
    }
    /**
     * for 循环检查,2019-04-14重构代码，更新列表渲染逻辑
     * 考虑在列表渲染时就做bind数据操作的可能性
     * @param nodeData 检查节点
     * @param parentNodeData 检查节点的父节点
     */
    private renderRepeat(nodeData: IVirtualElement): void {
        if(nodeData) {
            let index = 0;
            let maxIndex = nodeData.children.length;
            while(index<maxIndex) {
                const checkNode = nodeData.children[index];
                const repResult:any = this.renderRepeatAction(checkNode);
                if(repResult.isRepeat) {
                    const forItems:IVirtualElement[] = repResult.data || [];
                    if(forItems.length>0) {
                        nodeData.children.splice(index,1,...forItems);
                        for(let i=index;i<nodeData.children.length;i++) {
                            // 修复更新path，问题导致循环渲染位置错乱
                            this.virtualDom.init(nodeData);
                            this.virtualDom.updatePath(nodeData.children[i],nodeData.path, i);
                            this.virtualDom.clear();
                            this.renderRepeat(nodeData.children[i]);  // 继续for循环检测， 需要在更新path以后，以便下一层子元素能拿到正确的path数据
                        }
                        index += forItems.length - 1;
                    } else {
                        // ----循环渲染没有内容，删除承载for语句元素
                        nodeData.children[index].status = "DELETE";
                        index += 1;
                    }
                } else {
                    index += 1;
                    this.renderRepeat(checkNode);  // 检查下一层元素
                }
            }
            maxIndex = null;
        }
    }
    /**
     * 执行循环解析动作
     * @param nodeData 检查节点
     */
    private renderRepeatAction(nodeData: IVirtualElement): object {
        const result = new Array<IVirtualElement>();
        const attr = nodeData.props || {};
        const attrKeys = Object.keys(attr);
        let isRepeat = false;
        for (let j = 0; j < attrKeys.length; j++) {
            const subKey = attrKeys[j];
            const reg = /^\s*(em|act):for\s*$/i;
            if (reg.test(subKey)) {
                const repeateValue = attr[subKey];
                const valueReg = /^\s*let\s+([a-z0-9.]*)\s+in\s+([a-z0-9._]*)\s*$/i;
                const noLetReg = /^\s*([a-z0-9.]*)\s+in\s+([a-z0-9._]*)\s*$/i;
                const isMatch = valueReg.test(repeateValue) || noLetReg.test(repeateValue); // noLetReg 正则匹配兼容旧版本component
                if (isMatch) {
                    const matchData = repeateValue.match(valueReg) || repeateValue.match(noLetReg);
                    isRepeat = true;
                    if (matchData) {
                        const key = matchData[1], valueKey = matchData[2];
                        let repeatSource = null;
                        const propsData = nodeData.data || {};
                        // delete propsData["isClosed"];
                        if (/^this./i.test(valueKey)) {
                            repeatSource = this.getValue(this.renderComponent, valueKey.replace(/^this./i, ""));
                        } else {
                            // 使用从父组件传下来的值
                            repeatSource = this.getValue(propsData, valueKey);
                        }
                        if (this.isArray(repeatSource) || this.isObject(repeatSource)) {
                            delete nodeData.props[subKey];
                            let sourceKeys = Object.keys(repeatSource);
                            if(sourceKeys.length>0) {
                                this.virtualDom.clear();
                                this.virtualDom.init(nodeData);
                                for (let i = 0; i < sourceKeys.length; i++) {
                                    const updateValue = {};
                                    const sourceKey = sourceKeys[i];
                                    updateValue[key] = repeatSource[sourceKey];
                                    if(this.isObject(updateValue[key])) {
                                        updateValue[key].key = i;
                                    }
                                    ((currentData, delAttrKey) => {
                                        const newNode: IVirtualElement = this.virtualDom.clone();
                                        delete newNode.props[delAttrKey];
                                        newNode.data["index"] = i;
                                        this.updateElementDataToAllChild(newNode, currentData);
                                        result.push(newNode);
                                    })(updateValue, subKey);
                                }
                            }
                            sourceKeys = null;
                        } else {
                            nodeData.status = "DELETE";
                            nodeData.props.if = false;
                            delete nodeData.props[subKey];
                        }
                    }
                }
                break;
            }
        }
        // if (!isRepeat) {
        //     delete nodeData.data["isClosed"];
        // }
        return {
            data: result,
            isRepeat
        };
    }
    private updateElementDataToAllChild(updateDom: IVirtualElement, updateValue: any): void {
        if(updateValue) {
            updateDom.data = {
                ...(updateDom.data||{}),
                ...updateValue
            };
        }
        updateDom.children.map((subDom: VirtualElement) => {
            this.updateElementDataToAllChild(subDom, updateValue);
        });
    }
    private updateElementPath(updateDom: VirtualElement, level: number, value: number): void {
        if(updateDom) {
            updateDom.path[level] = value;
            updateDom.children.map((tmpItem) => {
                this.updateElementPath(<VirtualElement>tmpItem, level, value);
            });
        }
    }
    private decodeLogicWards(logicCode: string): string {
        let logicResult = logicCode || "";
        logicResult = logicResult.replace(/\seq\s/i, "===")
            .replace(/\sneq\s/i, "!==")
            .replace(/\sgt\s/i, ">")
            .replace(/\sgteq\s/i, ">=")
            .replace(/\slt\s/i, "<")
            .replace(/\slteq\s/i, "<=");
        return logicResult;
    }
    /**
     * 根据属性值代码获取绑定事件执行的方法,指定事件方法代码的多样性可在此扩展
     * @param valueCode 指定事件方法的代码
     * @param optionData 从父元素传递下来的变量
     */
    private getBindAction(valueCode: string, optionData: object): any {
        let resultAction: Function = null;
        const bindTargetReg = /^\s*([a-z0-9\-._]*)(.bind\(([a-z0-9]*)\))\s*$/i;
        let bindTarget = {};
        if (/^\s*[a-z0-9\-._]*\s*$/i.test(valueCode)) {
            const action1 = this.getValue(this.renderComponent, valueCode);
            resultAction = this.isFunction(action1) ? action1 : this.getValue(optionData, valueCode);
            if(typeof resultAction === "function") {
                bindTarget = {
                    data: optionData,
                    owner: this.renderComponent
                };
                resultAction = resultAction.bind(this.renderComponent);
            }
        } else if (bindTargetReg.test(valueCode)) {
            const bindTargetValueMatch = valueCode.match(bindTargetReg);
            if (bindTargetValueMatch) {
                const actionValueKey = bindTargetValueMatch[1],
                    actionBindTargetKey = bindTargetValueMatch[3];
                let actionValue = this.getValue(this.renderComponent, actionValueKey);
                let actionBindTarget = actionBindTargetKey === "this" ? this.renderComponent : this.getValue(this.renderComponent, actionBindTargetKey);
                actionValue = actionValue !== undefined ? actionValue : this.getValue(optionData, actionValueKey);
                actionBindTarget = actionBindTarget !== undefined ? actionBindTarget : this.getValue(optionData, actionBindTargetKey);
                if (this.isFunction(actionValue)) {
                    bindTarget = {
                        data: optionData,
                        owner: actionBindTarget
                    };
                    resultAction = actionValue.bind(actionBindTarget);
                }
            }
        }
        return {
            callBack: resultAction,
            handler: bindTarget
        };
    }
    private getBindText(text: string, optionData: object): string {
        let staticReg = /\s*\{\{\s*([\!a-zA-Z0-9\-_.\s\|\'\"]*)\s*\}\}\s*/i;
        let trueReg = /\s*\{\{\s*(true)\s*\}\}\s*/i;
        let falseReg = /\s*\{\{\s*(false)\s*\}\}\s*/i;
        let numReg = /\s*\{\{\s*([0-9\.]*)\s*\}\}\s*/i;
        let resultText: any = text;
        let middleRenderResult = this.renderMiddelware.virtualRenderBindText(this.renderComponent, text, optionData);
        if(middleRenderResult !== undefined) {
            resultText = middleRenderResult;
        }
        middleRenderResult = null;
        if (!this.isEmpty(resultText)) {
            if (staticReg.test(resultText) && !trueReg.test(resultText) && !falseReg.test(resultText)) {
                let sigleReg = /\s*\{\{\s*([\!a-z0-9\-_.]*)\s*\}\}\s*/i;
                let staticRegEx = /\s*(\{\{\s*(([a-z\s\d\w\|\'\"\.]*)([^\x00-\xff]*))*\s*\}\})\s*/img;
                let staticMatchs:RegExpMatchArray = text.match(staticRegEx) || [];
                if (staticMatchs.length > 0) {
                    let setDefaultReg1 = /\s*\{\{\s*([\!a-z0-9\-_.]*)\s*\|\s*([\!a-z0-9\-_.]*)\s*\}\}\s*/i;
                    let setDefaultReg2 = /\s*\{\{\s*([\!a-z0-9\-_.]*)\s*\|\s*\'\s*(.*)\s*\'\s*\}\}\s*/i;
                    let setDefaultReg3 = /\s*\{\{\s*([\!a-z0-9\-_.]*)\s*\|\s*\"\s*(.*)\s*\"\s*\}\}\s*/i;
                    for (let i = 0; i < staticMatchs.length; i++) {
                        let staticMatch = staticMatchs[i];
                        let staticMatchValue = staticMatch.match(/^\s*\{\{\s*([\!a-zA-Z0-9\-_.]*)\s*\}\}\s*$/i);
                        let setDefaultReg1Value = staticMatch.match(setDefaultReg1),
                            setDefaultReg2Value = staticMatch.match(setDefaultReg2),
                            setDefaultReg3Value = staticMatch.match(setDefaultReg3);
                        let staticValueKey = staticMatchValue ? staticMatchValue[1] : "";
                        let defaultValueKey = "", defaultValueIsText = true;
                        if(setDefaultReg1Value) {
                            staticValueKey = setDefaultReg1Value[1];
                            defaultValueKey = setDefaultReg1Value[2];
                            defaultValueIsText = false;
                        } else if(setDefaultReg2Value) {
                            staticValueKey = setDefaultReg2Value[1];
                            defaultValueKey = setDefaultReg2Value[2];
                        } else if(setDefaultReg3Value) {
                            staticValueKey = setDefaultReg3Value[1];
                            defaultValueKey = setDefaultReg3Value[2];
                        }

                        let isValueXor = /^\s*\!/.test(staticValueKey);
                        staticValueKey = staticValueKey.replace(/^(\s*\!)/,"").replace(/^(\s*this\.)/, "");
                        let staticValue = this.getValue(this.renderComponent, staticValueKey);
                        staticValue = staticValue !== undefined ? staticValue : (optionData ? this.getValue(optionData, staticValueKey) : undefined);
                        // set second parameter to bind result when the first parameter is undefined or null
                        if(staticValue === undefined || staticValue === null) {
                            if(defaultValueIsText) {// the second parameter is a static string
                                staticValue = defaultValueKey;
                            } else { // The second parameter is the bound value index;
                                let isXorValue = /^\s*\!/.test(defaultValueKey);
                                let defaultValue = null;
                                defaultValueKey = defaultValueKey.replace(/^\s*\!/, "").replace(/^(\s*this\.)/, "");
                                defaultValue = this.getValue(this.renderComponent, defaultValueKey);
                                if(defaultValue === undefined) {
                                    defaultValue = this.getValue(optionData, defaultValueKey);
                                }
                                if(isXorValue) {
                                    defaultValue = !defaultValue;
                                }
                                staticValue = defaultValue;
                                isXorValue = null;
                            }
                        }
                        if(isValueXor) {
                            staticValue = !staticValue;
                        }
                        let singleStr = resultText.replace(sigleReg, "");
                        if(!this.isEmpty(singleStr)) {
                            if(this.isString(resultText)) {
                                while (resultText.indexOf(staticMatch) >= 0) {
                                    let replaceMatch = staticMatch.match(/(\{\{.*\}\})/);
                                    let replaceValue = replaceMatch ? replaceMatch[0] : staticMatch;
                                    resultText = resultText.replace(replaceValue, staticValue);
                                    replaceMatch = null;
                                    replaceValue = null;
                                }
                            }
                        } else {
                            resultText = staticValue;
                        }
                        singleStr = null;
                        isValueXor = null;
                        staticMatch = null;
                        staticMatchValue = null;
                        setDefaultReg1Value = null;
                        setDefaultReg2Value = null;
                        setDefaultReg3Value = null;
                    }
                    setDefaultReg1 = null;
                    setDefaultReg2 = null;
                    setDefaultReg3 = null;
                }
                if(this.isEmpty(resultText) && numReg.test(text)) {
                    const numMatch = text.match(numReg);
                    const num = numMatch[1];
                    resultText = /\./.test(num) ? parseFloat(num) : parseInt(num,10);
                }
                sigleReg = null;
                staticRegEx = null;
                staticMatchs = null;
            } else {
                if(trueReg.test(text)) {
                    resultText = true;
                } else if(falseReg.test(text)) {
                    resultText = false;
                }
            }
            staticReg = null;
            trueReg = null;
            falseReg = null;
            numReg = null;
            return this.isObject(resultText) ? JSON.parse(JSON.stringify(resultText)) : resultText;
        } else {
            staticReg = null;
            trueReg = null;
            falseReg = null;
            return "";
        }
    }
    /**
     * 解析绑定属性, 更新绑定数据读取逻辑:elmer 2019/11/13 22:45
     * @param nodeData 解析虚拟dom数据
     */
    private getBindAttrAndEvents(nodeData: IVirtualElement): VirtualNodeData {
        const attr = nodeData.props || {},
            attrKeys = Object.keys(attr);
        const bindReg = /\s*\{\{.*\}\}\s*/,
            eventReg = /^(evt|et):([a-zA-Z\-_]*)/i,
            logicReg = /^(act|em):([a-z0-9\-_]*)$/i,
            attrLogicReg = /^[a-z]+\.[a-z0-9\-_]+$/i;
        let result:any = {};
        const events:IHtmlNodeEventData[] = [];
        const optionData = nodeData.data || {};
        const dataSet: any = {};
        try {
            attrKeys.map((attrKey) => {
                if (eventReg.test(attrKey)) {
                    const eventArgs = attrKey.match(eventReg) || {};
                    const eventName = (<any>eventArgs)[2];
                    const eventActionData: any = this.getBindAction(attr[attrKey], nodeData.data || {});
                    events.push({
                        callBack: eventActionData.callBack,
                        eventName,
                        handler : eventActionData.handler
                    });
                } else if (bindReg.test(attr[attrKey]) || attrKey === "...") {
                    const bindAttrValue = this.getBindText(attr[attrKey], nodeData.data || {});
                    if(attrKey === "...") {
                        // not support expand array
                        if(this.isObject(bindAttrValue)) {
                            result = {
                                ...result,
                                ...(<any>bindAttrValue)
                            };
                        } else {
                            result[bindAttrValue] = bindAttrValue;
                        }
                    } else {
                        result[attrKey] = bindAttrValue;
                        if(/^data\-/i.test(attrKey)) {
                            dataSet[attrKey.replace(/^data\-/i, "")] = bindAttrValue;
                        }
                    }
                } else if ((logicReg.test(attrKey) || attrLogicReg.test(attrKey)) && !/^em\:for/i.test(attrKey)) {
                    let checkCode = attr[attrKey];
                    if (!this.isEmpty(checkCode) && this.isString(checkCode)) {
                        if(!this.renderMiddelware.virtualRenderLogic(
                            this.renderComponent,{
                            attrKey,
                            attrValue: checkCode,
                            optionData: nodeData.data || {}
                        }, result)) {
                            const nThisReg = /^\s*(\!this.[a-z0-9\-_.]*)\s*$/img;
                            const thisReg = /^\s*(this.[a-z0-9\-_.]*)\s*$/img;
                            const thisMatch = checkCode.match(nThisReg)||
                                checkCode.match(/^[!a-z\-_]*\.(([a-z\-_.]*)|([a-z\-_]*\.bind\([a-z\-_]*\)))\s*$/ig) ||
                                checkCode.match(thisReg);
                            let checkResult;
                            if (thisMatch) {
                                // elmerData.bindTempVars = tmpVars;
                                for (let j = 0; j < thisMatch.length; j++) {
                                    let bindKeyValue:string = thisMatch[j];
                                    let isXorValue = /^\s*\!/.test(bindKeyValue);
                                    let checkBindKeyValue = bindKeyValue.replace(/^\s*\!/, "");
                                    let isBindThis = /^\s*this\./i.test(checkBindKeyValue);
                                    let bindValue;
                                    if(isBindThis) {
                                        checkBindKeyValue = checkBindKeyValue.replace(/^\s*this\./, "");
                                        bindValue = this.getValue(this.renderComponent, checkBindKeyValue);
                                    } else {
                                        bindValue = this.getValue(this.renderComponent, checkBindKeyValue);
                                        if(bindValue === undefined) {
                                            bindValue = this.getValue(optionData, checkBindKeyValue);
                                        }
                                    }
                                    if(this.isString(bindValue)) {
                                        checkCode = checkCode.replace(bindKeyValue, bindValue);
                                        checkResult = checkCode;
                                    } else {
                                        if(this.isFunction(bindValue)) {
                                            checkResult = bindValue.call(this.renderComponent, optionData);
                                        } else {
                                            checkResult = bindValue;
                                        }
                                    }
                                    if(isXorValue) {
                                        checkResult = !checkResult;
                                    }
                                    isBindThis = null;
                                    bindValue  = null;
                                    bindKeyValue = null;
                                    isXorValue = null;
                                }
                            } else {
                                if(/^\s*this\s*$/.test(checkCode)) {
                                    checkResult = this.renderComponent;
                                } else {
                                    checkResult = optionData[checkCode] ? optionData[checkCode] : "";
                                }
                            }
                            const resultAttrKey = attrKey.replace(/^[a-z]*:/i, "");
                            result[resultAttrKey] = checkResult;
                            if(/^data\-/i.test(resultAttrKey)) {
                                dataSet[resultAttrKey.replace(/^data\-/i, "")] = checkResult;
                            }
                        }
                    } else {
                        result[attrKey] = checkCode;
                    }
                } else if(/^ex\:/i.test(attrKey) || /^\.\.\./i.test(attrKey)) {
                    const attrValueKey = attr[attrKey];
                    let attrValue = this.getValue(this.renderComponent, attrValueKey);
                    if(attrValue === undefined) {
                        attrValue = this.getValue(optionData, attrValueKey);
                    }
                    if(this.isObject(attrValue)) {
                        this.extend(result, attrValue);
                    } else {
                        result[attrKey] = attrValue;
                    }
                } else if (/^bind$/.test(attrKey)) {
                    events.push({
                        callBack: this.renderBindAttribute(attr[attrKey], this.renderComponent),
                        eventName: "change",
                        handler: {bindKey: attr[attrKey], target: this.renderComponent}
                    });
                    events.push({
                        callBack: this.renderBindAttribute(attr[attrKey], this.renderComponent),
                        eventName: "keyup",
                        handler: {bindKey: attr[attrKey], target: this.renderComponent}
                    });
                } else {
                    result[attrKey] = attr[attrKey];
                    if(/^data\-/i.test(attrKey)) {
                        dataSet[attrKey.replace(/^data\-/i, "")] = attr[attrKey];
                    }
                }
            });
            if(result["ex:props"]) {
                const exProps = result["ex:props"];
                this.merge(result, exProps);
                delete result["ex:props"];
            }
        } catch (e) {
            // tslint:disable-next-line:no-console
            console.error(e, nodeData, this.renderComponent);
        }
        return {
            attrs: result,
            dataSet,
            events
        };
    }
    /**
     * 自动做数据绑定，bind="saveKey|callBackKey" 或 bind="saveKey"
     * @param attrValue 绑定配置数据
     * @param targetComponent 当前Component对象
     */
    private renderBindAttribute(attrValue: any,targetComponent: any): Function {
        return (function(evt:IElmerEvent): void {
            const bindAttrValue: string = this.bindKey;
            const bindArr = bindAttrValue.split("|");
            const callBackKey = bindArr.length>1 ? bindArr[1] : null;
            const bindKey = bindArr[0] || "";
            const callBack = this.target.getValue(this.target, callBackKey) || this.target.getValue(evt.data, callBackKey);
            const value = (<any>evt.target).value;
            const onChangeKey = bindArr.length > 2 ? bindArr[2] : null;
            const onChange = this.target.getValue(this.target, onChangeKey);
            if(typeof callBack === "function") {
                const newValue = callBack.call(this.target, {
                    ...evt,
                    value
                });
                if(newValue !== undefined) {
                    this.target.setValue(this.target, bindKey, newValue);
                }
            } else {
                this.target.setValue(this.target, bindKey, value);
            }
            typeof onChange === "function" && onChange.call(this.target, evt);
        }).bind({bindKey: attrValue, target: targetComponent});
    }
    private renderAttribute(nodeItem: IVirtualElement): boolean {
        const bindData = this.getBindAttrAndEvents(nodeItem);
        nodeItem.props = bindData.attrs;
        nodeItem.events = bindData.events;
        nodeItem.dataSet = bindData.dataSet;
        if(nodeItem.tagName === "text") {
            nodeItem.innerHTML = this.getBindText(nodeItem.innerHTML, nodeItem.data || {});
        } else {
            let childrenChanged = false;
            let newChildren = [];
            let saveKeyAttrValue = [];
            nodeItem.children.map((checkItem, index) => {
                // tslint:disable-next-line:no-shadowed-variable
                const isRender = this.renderAttribute(<VirtualElement>checkItem);
                if(!isRender) {
                    childrenChanged = true;
                } else {
                    if(checkItem.props && !this.isEmpty(checkItem.props.key)) {
                        if(saveKeyAttrValue.indexOf(checkItem.props.key + "")<0) {
                            saveKeyAttrValue.push(checkItem.props.key + "");
                        } else {
                            // tslint:disable-next-line: no-console
                            console.error(`Child elements under the same parent element cannot have the same key set. [${checkItem.props.key}]`);
                        }
                    }
                }
                delete checkItem.props["if"];
                newChildren.push(checkItem);
            });
            saveKeyAttrValue = null;
            if(childrenChanged) {
                nodeItem.children = newChildren;
            }
            newChildren = null;
        }
        let isRender = true;
        if(Object.keys(bindData.attrs).indexOf("if")>=0) {
            isRender = bindData.attrs.if;
            if(!isRender || isRender === undefined) {
                isRender = false;
                nodeItem.status = "DELETE";
            } else {
                isRender = true;
            }
        }
        return isRender;
    }
}
