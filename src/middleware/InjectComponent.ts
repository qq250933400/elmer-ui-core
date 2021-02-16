import { Common } from "elmer-common";
import { attachReducerToController, defineReducer, ReduxController } from "elmer-redux";
import { IVirtualElement } from "elmer-virtual-dom";
import { IComponent } from "../component/IComponent";
import { IReduxConnect } from "../component/IDeclareComponent";
import { defineGlobalState, getGlobalState } from "../init/globalUtil";
import { autowired, injectable } from "../inject/injectable";
import { IPropCheckRule } from "../propsValidation";

@injectable("InjectComponent")
export class InjectComponent extends Common {

    @autowired(ReduxController, "ReduxController")
    private reduxController: ReduxController;

    constructor() {
        super();
        this.reduxController.checkInitStateData(getGlobalState, defineGlobalState);
        this.reduxController.setNotifyCallback(["$onPropsChanged", "$willReceiveProps"]);
    }
    /**
     * 初始化组件完成后执行,挂载组件示例到redux,用于数据更新以后通知组件
     * @param targetComponent object 创建的组件
     * @param ComponentClass  Class 创建组件类
     * @param nodeData 创建组件的虚拟dom数据
     */
    initComponent(targetComponent:IComponent, ComponentClass: any, nodeData:IVirtualElement): void {
        // 创建component执行一次
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
    /**
     * 创建component前执行此方法，设置props默认值，可从redux中获取默认数据
     * @param ComponentClass
     * @param props
     * @param nodeData
     */
    beforeInitComponent(ComponentClass: any,props: any, nodeData: IVirtualElement): void {
        const reduxParam:IReduxConnect = ComponentClass.prototype.connect;
        if(reduxParam) {
            if(reduxParam.reducers && reduxParam.reducers.length > 0) {
                reduxParam.reducers.map((tmpReducer) => {
                    if(typeof tmpReducer.callback === "function") {
                        defineReducer(this.reduxController, tmpReducer.name, tmpReducer.callback as any);
                    } else {
                        // tslint:disable-next-line: no-console
                        console.error("Redux's reducer callback should be an function");
                    }
                });
                if(!this.reduxController.reducers) {
                    this.reduxController.reducers = {};
                }
                attachReducerToController(this.reduxController);
            }
            if(reduxParam.mapStateToProps || reduxParam.mapDispatchToProps) {
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
        }
        this.setDefaultValue(props, ComponentClass.propType);  // 在创建组件object之前对props做默认值检查
    }
    private setDefaultValue(props:any, checkRules: any): void {
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
}
