import { Common } from "elmer-common";
import { Service } from "../decorators";

type TypeContextStoreCreateOptions = {
    component: any;
    initState?: any;
    nodeId: string;
    path?: string;
};

export type TypeContextStoreCreateResult = {
    state: any;
    name: string|null|undefined;
    nodeId: string;
    dispatch: (state: any) => void;
    subscribe: (callback: Function) => void;
};

const contextStore = {};

// tslint:disable object-literal-sort-keys

@Service
export class ContextStore extends Common {
    /**
     * 创建context
     * @param options - 创建参数
     * @returns 返回创建store对象
     */
    createStore(options: TypeContextStoreCreateOptions): TypeContextStoreCreateResult {
        const storeId = this.isEmpty(options.path) ? options.nodeId : options.path + "." + options.nodeId;
        const nodeStore = {
            state: !this.isEmpty(options?.initState?.name) ? options?.initState?.data : options?.initState,
            name: options?.initState?.name,
            nodeId: storeId,
            listeners: {},
            dispatch: ((id: string) => {
                return (state: any) => {
                    return new Promise<any>((resolve) => {
                        const targetStore = this.getValue<any>(contextStore, id);
                        targetStore.state = {
                            ...(targetStore.state || {}),
                            ...(state || {})
                        };
                        // 触发数据修改事件
                        Object.keys(targetStore.listeners).map((key) => {
                            targetStore.listeners[key]({
                                ...targetStore.state
                            });
                        });
                        resolve(targetStore.state);
                    });
                };
            })(storeId),
            subscribe: ((id: string) => {
                return (callback: Function): Function => {
                    const evtId = "contextStore_subscribe_" + this.guid();
                    const targetStore = this.getValue<any>(contextStore, id);
                    targetStore.listeners[evtId] = callback;
                    return () => {
                        delete targetStore.listeners[evtId];
                    };
                };
            })(storeId)
        };
        if(!this.isEmpty(options.path)) {
            let parentStore = this.getValue(contextStore, options.path);
            if(parentStore) {
                this.defineReadOnlyProperty(parentStore as any, options.nodeId, nodeStore);
            } else {
                parentStore = {};
                this.setValue(contextStore, options.path, parentStore);
                this.defineReadOnlyProperty(parentStore as any, options.nodeId, nodeStore);
            }
        } else {
            this.defineReadOnlyProperty(contextStore as any, options.nodeId, nodeStore);
        }
        return {
            state: nodeStore.state,
            name: nodeStore.name,
            nodeId: nodeStore.nodeId,
            dispatch: nodeStore.dispatch,
            subscribe: nodeStore.subscribe
        };
    }
    getContext(configData: any) {
        const result = {};
        if(configData) {
            // tslint:disable-next-line: forin
            for(const key in configData) {
                const storeData = configData[key];
                const newData = {
                    dispatch: storeData.dispatch,
                    subscribe: storeData.subscribe,
                    state: {
                        ...(storeData.state || {})
                    }
                };
                if(!this.isEmpty(storeData.name)) {
                    if(!result[storeData.name]) {
                        result[storeData.name] = newData;
                    } else {
                        result[key] = newData;
                    }
                } else {
                    result[key] = newData;
                }
            }
        }
        return result;
    }
}
// tslint:enable object-literal-sort-keys
