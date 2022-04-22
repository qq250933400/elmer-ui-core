import { utils } from "elmer-common";
import { Component } from "../component/Component";
import { IPropValidator } from "../propsValidation";
import { TypeRenderMiddlewareEvent } from "./ARenderMiddleware";
import { RenderMiddlewarePlugin } from "./RenderMiddlewarePlugin";

export class PluginPropsChecking extends RenderMiddlewarePlugin {
    beforeInit(options: TypeRenderMiddlewareEvent): void {
        if(options?.props && options?.props["..."]) {
            const extProps = options?.props["..."];
            if(utils.isObject(extProps)) {
                Object.keys(extProps).map((attrKey: string) => {
                    if(attrKey !== "children") {
                        (options.props as any)[attrKey] = extProps[attrKey];
                    }
                });
            }
            delete options?.props["..."];
        }
        if(options.nodeData.events) {
            Object.keys(options.nodeData.events).map((eventKey) => {
                options.props[eventKey] = options.nodeData.events[eventKey];
            });
        }
        if(typeof options.Component.prototype["__loadComponentCallback__"] === "function") {
            const defineComponents = options.Component.prototype["__loadComponentCallback__"](options.props);
            const allComponents = options.Component.prototype["components"] || {};
            if(defineComponents) {
                delete options.Component.prototype.components;
                utils.defineReadOnlyProperty(options.Component.prototype, "components", {
                    ...allComponents,
                    ...defineComponents
                });
            }
        }
    }
    init(options: TypeRenderMiddlewareEvent): void {
        this.checkPropTypes(options.componentObj, options.Component, options.props, options.nodeData.tagName);
    }
    willReceiveProps(options: TypeRenderMiddlewareEvent): void {
        this.checkPropTypes(options.componentObj, options.Component, options.props,options.nodeData.tagName);
    }
    private checkPropTypes(targetComponent:Component, ComponentClass:any, props: any, tagName?: string): void {
        const propTypes = ComponentClass["propType"] || ComponentClass["propTypes"] || {};
        const propKeys = Object.keys(propTypes) || [];
        if(propKeys.length>0) {
            this.checkPropTypesCallBack(targetComponent, propTypes, props, tagName);
        }
    }
    private checkPropTypesCallBack(target: any,checkRules: any, props: any, tagName?: string): void {
        Object.keys(checkRules).map((tmpKey: any) => {
            let checkRuleData:IPropValidator|Function  = checkRules[tmpKey];
            if(utils.isFunction(checkRuleData)) {
                this.doCheckPropType(target, tmpKey, checkRuleData, tagName, props);
            } else if(utils.isObject(checkRuleData)) {
                let checkData:IPropValidator = checkRuleData as any;
                if(( undefined === props[tmpKey] || null === props[tmpKey]) && checkData.defaultValue) {
                    delete props[tmpKey];
                    props[tmpKey] = checkData.defaultValue;
                }
                if(utils.isFunction(checkData.rule)) {
                    this.doCheckPropType(target, tmpKey, <Function>checkData.rule, tagName, props);
                }
                // 定义propertyKey 自动mapping值到组件定义属性上
                if(!utils.isEmpty(checkData.propertyKey)) {
                    target[checkData.propertyKey] = target.props[tmpKey];
                }
                // 定义stateKey自动mapping值到state属性上
                if(!utils.isEmpty(checkData.stateKey)) {
                    target.state[checkData.stateKey] = target.props[tmpKey];
                }
                checkData = null;
            }
            checkRuleData = null;
        });
    }
    /**
     * 做prop数据类型检查
     * @param target any 检查component
     * @param propertyKey prop属性关键词
     * @param checkCallBack 数据类型检查规则
     */
    private doCheckPropType(target: any, propertyKey: string, checkCallBack: Function, tagName: string, props: any): void {
        const propValue = props[propertyKey];
        utils.isFunction(checkCallBack) && checkCallBack(propValue, {
            error: (msg: any, type:any) => {
                const tagNameNS = utils.humpToStr(target["selector"]) || tagName;
                const sMsg = "组件【"+tagNameNS+"】属性【"+propertyKey+"】设置错误：" + msg;
                // tslint:disable-next-line:no-console
                console.error(sMsg, type);
            },
            propertyName: propertyKey,
            propertyValue: propValue
        });
    }
}
