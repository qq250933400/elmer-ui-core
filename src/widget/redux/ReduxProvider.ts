import {
    attachReducerToController,
    defineReduxProvider,
    defineStateOperateAction,
    IStoragePlugin,
    IStoragePluginFactory,
    ReduxController,
    TypeReduxSaveStorage
} from "elmer-redux";
import { Component } from "../../core/Component";
import { defineGlobalState, getGlobalState } from "../../init/globalUtil";
import { autoInit, autowired, declareComponent } from "../../inject";
import { IPropCheckRule, PropTypes } from "../../propsValidation";

type TypeReduxProviderPropsCheckRule = {
    autoSave: IPropCheckRule;
    reducers: IPropCheckRule;
    saveStore: IPropCheckRule;
    defineStorage: IPropCheckRule;
};
type TypeReduxProviderProps = {
    autoSave: boolean;
    reducers: any;
    saveStore: TypeReduxSaveStorage;
    defineStorage: IStoragePluginFactory;
};

// transfer getGlobalState and defineGlobalState to reduxController,
defineStateOperateAction(autoInit(ReduxController), getGlobalState, defineGlobalState);

@declareComponent({
    selector: "ReduxProvider"
})
export class ReduxProvider extends Component {
    static propType: TypeReduxProviderPropsCheckRule = {
        autoSave: {
            description: "自动保存到sessionStorage",
            rule: PropTypes.bool
        },
        defineStorage: {
            description: "define storage factory",
            rule: PropTypes.func
        },
        reducers: {
            defaultValue: {},
            description: "Redux监听方法集合",
            rule: PropTypes.object.isRequired
        },
        saveStore: {
            defaultValue: "SessionStorage",
            description: "Redux保存方式",
            rule: PropTypes.oneValueOf(["SessionStorage", "LocalStorage", "StoragePlugin"]).isRequired
        }
    };
    props: TypeReduxProviderProps;
    @autowired(ReduxController)
    private reduxController: ReduxController;
    constructor(props: TypeReduxProviderProps) {
        super(props);
        this.reduxController.reducers = props.reducers;
        this.reduxController.autoSave = props.autoSave;
        switch(props.saveStore) {
            case "SessionStorage":
                this.reduxController.saveStore = sessionStorage;
                break;
            case "LocalStorage":
                this.reduxController.saveStore = localStorage;
                break;
            case "StoragePlugin":
                if(typeof props.defineStorage === "function") {
                    this.reduxController.saveStore = <IStoragePlugin>(new props.defineStorage());
                } else {
                    throw new Error("The defineStroage attribute can not be null or undefined.");
                }
                break;
            default:
                this.reduxController.saveStore = sessionStorage;
        }
        // tslint:disable-next-line: no-console
        console.log("Init Redux Provider");
    }
    $init(): void {
        defineReduxProvider(getGlobalState, defineGlobalState);
        attachReducerToController(this.reduxController);
        this.initDefaultState();
    }
    initDefaultState(): void {
        let myReducer = this.props.reducers || {};
        // restore the redux state from dataStorage if autoSave equal true;
        if(this.reduxController.autoSave) {
            let stateDataStr = this.reduxController.saveStore.getItem(this.reduxController.saveDataKey);
            if(!this.isEmpty(stateDataStr)) {
                this.reduxController.stateData = JSON.parse(stateDataStr);
                stateDataStr = null;
            }
        }
        this.initState(myReducer, this.reduxController.stateData, null);
        myReducer = null;
        this.reduxController.reducers = null; // 在初始化时已经做扁平化处理，保存的节点不需要;
        delete this.reduxController.reducers;
    }
    render(): string {
        return "<div class='eui-redux-provider'><content></content></div>";
    }
    private initState(reducer: any, stateData: any, nodeKey: string): any {
        if (this.isFunction(reducer)) {
            const initState = reducer(undefined, {
                type: "INIT_REDUCER_STATE"
            });
            const nodeKeyValue = nodeKey.replace(/^\./, "");
            delete this.reduxController.reducersData[nodeKeyValue];
            Object.defineProperty(this.reduxController.reducersData, nodeKeyValue, {
                configurable: true,
                enumerable: true,
                get: () => {
                    return reducer;
                },
                set: () => {
                    // tslint:disable-next-line:no-console
                    console.error("不允许直接修改Redux数据");
                }
            });
            if(undefined === initState || null === initState) {
                // tslint:disable-next-line: no-console
                console.error("No init state return from reducer: " + nodeKeyValue);
            } else {
                this.defineStateValue(initState);
                return initState;
            }
        } else {
            Object.keys(reducer).map((tmpKey: string) => {
                if(!stateData[tmpKey]) {
                    stateData[tmpKey] = {};
                }
                const myData = this.initState(
                    reducer[tmpKey],
                    stateData[tmpKey],
                    (!this.isEmpty(nodeKey) ? [nodeKey, tmpKey].join(".") : tmpKey)
                );
                if(myData) {
                    this.defineReadOnlyProperty(stateData, tmpKey, myData);
                }
            });
        }
    }
    private defineStateValue(stateValue: any): void {
        if(this.isObject(stateValue)) {
            Object.keys(stateValue).map((stateKey: any) => {
                ((propsKey: any, propsValue: any) => {
                    if(this.isObject(propsValue)) {
                        this.defineStateValue(propsValue);
                    }
                    Object.defineProperty(stateValue, propsKey, {
                        configurable: true,
                        enumerable: true,
                        get: () => {
                            return propsValue;
                        },
                        set: () => {
                            // tslint:disable-next-line:no-console
                            console.error("不允许直接修改Redux数据！");
                        }
                    });
                })(stateKey, stateValue[stateKey]);
            });
        }
    }
}
