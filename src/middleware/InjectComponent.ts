import { Common } from "elmer-common";
import { ReduxController } from "elmer-redux";
import { IVirtualElement } from "elmer-virtual-dom";
import { IComponent } from "../component/IComponent";
import { I18nController } from "../i18n/i18nController";
import { defineGlobalState, getGlobalState } from "../init/globalUtil";
import { autowired, Injectable } from "../inject/injectable";
import { IPropCheckRule } from "../propsValidation";

@Injectable("InjectComponent")
export class InjectComponent extends Common {

    @autowired(I18nController)
    private i18nController: I18nController;
    @autowired(ReduxController, "ReduxController")
    private reduxController: ReduxController;

    constructor() {
        super();
        this.reduxController.checkInitStateData(getGlobalState, defineGlobalState);
        this.reduxController.setNotifyCallback(["$onPropsChanged", "$willReceiveProps"]);
    }
    /**
     * 运行第三方插件，此方法在Component创建时执行
     * @param targetComponent object 创建的组件
     * @param ComponentClass Class 创建组件类
     * @param nodeData 创建组件的虚拟dom数据
     */
    run(targetComponent:IComponent, ComponentClass: any, nodeData:IVirtualElement): void {
        // ----运行第三方插件
        this.checkPropTypes(targetComponent, ComponentClass); // 运行属性检查
    }
    /**
     * 初始化组件完成后执行
     * @param targetComponent object 创建的组件
     * @param ComponentClass  Class 创建组件类
     * @param nodeData 创建组件的虚拟dom数据
     */
    initComponent(targetComponent:IComponent, ComponentClass: any, nodeData:IVirtualElement): void {
        // 创建component执行一次
        this.i18nController.initI18nTranslate(targetComponent);
        const reduxParam = ComponentClass.prototype.connect;
        if(reduxParam && (reduxParam.mapStateToProps || reduxParam.mapDispatchToProps)) {
           this.reduxController.checkInitComponents(targetComponent, ComponentClass.prototype.selector, nodeData);
        }
    }
    /**
     * 当自定义component被销毁时执行此方法，一些插件需要依赖component的，需要在此做释放，否则导致挂载变量销毁不了
     * @param targetComponent any 销毁的组件
     * @param ComponentClass any 销毁组件类
     * @param nodeData any 销毁组件的虚拟dom数据
     */
    releaseComponent(targetComponent: any, nodeData:IVirtualElement): void {
        // 从reduxController把已经释放的组件移除引用
        if(targetComponent) {
            this.reduxController.removeComponent(targetComponent.selector, nodeData);
        }
    }
    /**
     * Before Component Update
     * @param targetComponent IComponent
     * @param ComponentClass ComponentFactory
     * @param props Component props data
     * @param nodeData [IVirtualElement] virtual dom
     */
    beforeUpdateComponent(targetComponent: any, ComponentClass: any, props: any, nodeData:IVirtualElement): void {
        // 先加载redux中的数据，在进行propsType检查，这样可以使用redux中的数据
        const reduxProps = this.reduxController.getStateByConnectSelector(ComponentClass.prototype.selector);
        const dispatchValue= this.reduxController.getDispatchByConnectSelector(ComponentClass.prototype.selector);
        this.isObject(reduxProps) && this.extend(props, reduxProps, true);
        this.isObject(dispatchValue) && this.extend(props, dispatchValue, true);
        this.setDefaultValue(props, ComponentClass.propType);
    }
    beforeInitComponent(ComponentClass: any,props: any, nodeData: IVirtualElement): void {
        const reduxParam = ComponentClass.prototype.connect;
        if(reduxParam && (reduxParam.mapStateToProps || reduxParam.mapDispatchToProps)) {
            // model,service,或自定义模块未定义selector会导致redux.connect失效，默认初始化一个参数
            if(this.isEmpty(ComponentClass.prototype.selector)) {
                this.defineReadOnlyProperty(ComponentClass.prototype, "selector", this.guid().replace(/\-/g, ""));
            }
            // 在初始化Component的时候在做connect操作，防止没有使用的组件但是定义了connect,在declareComponent的时候增加不必要的redux watch
            this.reduxController.connect(ComponentClass.prototype.selector, reduxParam.mapStateToProps, reduxParam.mapDispatchToProps);

            const stateValue = this.reduxController.getStateByConnectSelector(ComponentClass.prototype.selector);
            const dispatchValue= this.reduxController.getDispatchByConnectSelector(ComponentClass.prototype.selector);
            stateValue && this.extend(props, stateValue, true);
            dispatchValue && this.extend(props, dispatchValue, true);
        }
        this.setDefaultValue(props, ComponentClass.propType);  // 在创建组件object之前对props做默认值检查
    }
    setDefaultValue(props:any, checkRules: any): void {
        if(this.isObject(props) && this.isObject(checkRules)) {
            // const propsKey = Object.keys(props);
            Object.keys(checkRules).map((propKey:string) => {
                if(this.isObject(checkRules[propKey])) {
                    const tmpCheckRule:IPropCheckRule = checkRules[propKey];
                    if(this.isEmpty(props[propKey])) {
                        if(tmpCheckRule.defaultValue !== undefined) {
                            delete props[propKey];
                            this.defineReadOnlyProperty(props, propKey, tmpCheckRule.defaultValue);
                        }
                    }
                    if(typeof tmpCheckRule.rule === "function" && tmpCheckRule.rule["type"] === "number") {
                        if(!isNaN(props[propKey]) && this.isString(props[propKey])) {
                            const curValue = /\./.test(props[propKey]) ? parseFloat(props[propKey]) : parseInt(props[propKey], 10);
                            delete props[propKey];
                            this.defineReadOnlyProperty(props, propKey, curValue);
                        }
                    }
                }
            });
        }
    }
    checkPropTypes(targetComponent:IComponent, ComponentClass:any): void {
        const propTypes = ComponentClass["propType"] || {};
        const propKeys = Object.keys(propTypes) || [];
        if(propKeys.length>0) {
            this.checkPropTypesCallBack(targetComponent, propTypes);
        }
    }
    protected checkPropTypesCallBack(target: any,checkRules: any): void {
        Object.keys(checkRules).map((tmpKey: any) => {
            let checkRuleData:IPropCheckRule|Function  = checkRules[tmpKey];
            if(this.isFunction(checkRuleData)) {
                this.doCheckPropType(target, tmpKey, checkRuleData);
            } else if(this.isObject(checkRuleData)) {
                let checkData:IPropCheckRule = checkRuleData;
                if(this.isFunction(checkData.rule)) {
                    this.doCheckPropType(target, tmpKey, <Function>checkData.rule);
                }
                // 定义propertyKey 自动mapping值到组件定义属性上
                if(!this.isEmpty(checkData.propertyKey)) {
                    target[checkData.propertyKey] = target.props[tmpKey];
                }
                // 定义stateKey自动mapping值到state属性上
                if(!this.isEmpty(checkData.stateKey)) {
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
    protected doCheckPropType(target: any, propertyKey: string, checkCallBack: Function): void {
        const propValue = target.props[propertyKey];
        this.isFunction(checkCallBack) && checkCallBack(propValue, {
            error: (msg: any, type:any) => {
                const tagName = target.humpToStr(target["selector"]);
                const sMsg = "组件【"+tagName+"】属性【"+propertyKey+"】设置错误：" + msg;
                // tslint:disable-next-line:no-console
                console.error(sMsg, type);
            },
            propertyName: propertyKey,
            propertyValue: propValue
        });
    }
}
