import { StaticCommon as utils } from "elmer-common";
import { attachReducerToController, defineReducer, ReduxController } from "elmer-redux";
import { IReduxConnect } from "../component/IDeclareComponent";
import { defineGlobalState, getGlobalState } from "../core/globalState";
import { autowired, injectable } from "../injectable/injectable";
import { IPropValidator } from "../propsValidation";
import { TypeRenderMiddlewareEvent } from "./ARenderMiddleware";
import { RenderMiddlewarePlugin } from "./RenderMiddlewarePlugin";

@injectable("PluginRedux")
export class PluginRedux extends RenderMiddlewarePlugin {
    @autowired(ReduxController, "ReduxController")
    private reduxController: ReduxController;
    constructor() {
        super();
        this.reduxController.checkInitStateData(getGlobalState, defineGlobalState);
        this.reduxController.setNotifyCallback(["$onPropsChanged", "$willReceiveProps"]);
    }
    /**
     * 初始化Component结束事件，再次将被实例化对象挂载到redux
     * 并获取初始化状态数据
     * @param options - 生命周期函数事件参数
     */
    init(options: TypeRenderMiddlewareEvent): void {
        // 创建component执行一次
        const reduxParam = options.Component.prototype.connect;
        if(reduxParam && (reduxParam.mapStateToProps || reduxParam.mapDispatchToProps)) {
            this.reduxController.checkInitComponents(options.componentObj, options.Component.prototype.selector, options.nodeData);
        }
    }
    destroy(options: TypeRenderMiddlewareEvent): void {
         // 从reduxController把已经释放的组件移除引用
        if(options.componentObj) {
            this.reduxController.removeComponent((options.componentObj as any).selector, options.nodeData);
        }
    }
    beforeUpdate(options: TypeRenderMiddlewareEvent): void {
        // 先加载redux中的数据，在进行propsType检查，这样可以使用redux中的数据
        const reduxProps = this.reduxController.getStateByConnectSelector(options.Component.prototype.selector);
        const dispatchValue= this.reduxController.getDispatchByConnectSelector(options.Component.prototype.selector);
        utils.isObject(reduxProps) && utils.extend(options.props, reduxProps, true);
        utils.isObject(dispatchValue) && utils.extend(options.props, dispatchValue, true);
        this.setDefaultValue(options.props, (options.Component as any).propType);
    }
    /**
     * 在创建Component前检查是否有做connect动作，将reducer回调挂入redux监听列表
     * @param options - 执行事件参数
     */
    beforeInit?(options: TypeRenderMiddlewareEvent): void {
        const reduxParam:IReduxConnect = options.Component.prototype.connect;
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
                if(utils.isEmpty(options.Component.prototype.selector)) {
                    utils.defineReadOnlyProperty(options.Component.prototype, "selector", utils.guid().replace(/\-/g, ""));
                }
                // 在初始化Component的时候在做connect操作，防止没有使用的组件但是定义了connect,在declareComponent的时候增加不必要的redux watch
                this.reduxController.connect(options.Component.prototype.selector, reduxParam.mapStateToProps, reduxParam.mapDispatchToProps);
                // 执行init_state, 当前动作会触发所有的reducer,后续应限制执行的reducers
                this.reduxController.dispatch({
                    type: "__INIT_STATE__"
                });
                const stateValue = this.reduxController.getStateByConnectSelector(options.Component.prototype.selector);
                const dispatchValue= this.reduxController.getDispatchByConnectSelector(options.Component.prototype.selector);
                stateValue && utils.extend(options.props, stateValue, true);
                dispatchValue && utils.extend(options.props, dispatchValue, true);
            }
        }
        this.setDefaultValue(options.props, (options.Component as any).propType);  // 在创建组件object之前对props做默认值检查
    }
    private setDefaultValue(props:any, checkRules: any): void {
        if(utils.isObject(props) && utils.isObject(checkRules)) {
            // const propsKey = Object.keys(props);
            Object.keys(checkRules).map((propKey:string) => {
                if(utils.isObject(checkRules[propKey])) {
                    const tmpCheckRule:IPropValidator = checkRules[propKey];
                    if(utils.isEmpty(props[propKey])) {
                        if(tmpCheckRule.defaultValue !== undefined) {
                            delete props[propKey];
                            utils.defineReadOnlyProperty(props, propKey, tmpCheckRule.defaultValue);
                        }
                    }
                    if(typeof tmpCheckRule.rule === "function" && tmpCheckRule.rule["type"] === "number") {
                        if(!isNaN(props[propKey]) && utils.isString(props[propKey])) {
                            const curValue = /\./.test(props[propKey]) ? parseFloat(props[propKey]) : parseInt(props[propKey], 10);
                            delete props[propKey];
                            utils.defineReadOnlyProperty(props, propKey, curValue);
                        }
                    }
                }
            });
        }
    }
}
