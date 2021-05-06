import utils from "./utils";
const observerStorage = {};

export class Observer <T>{
    private name: string;
    constructor(name: string) {
        this.name = name;
        if(observerStorage[name]) {
            throw new Error(`the observer of ${name} already registe.`);
        } else {
            observerStorage[name] = {};
        }
    }
    /**
     * 添加事件监听
     * @param eventName 事件名称
     * @param callback 回调函数
     * @returns {Function} 手动销毁函数
     */
    on(eventName: T, callback: Function): Function {
        const id = utils.uuid();
        if(!observerStorage[this.name][eventName]) {
            observerStorage[this.name][eventName] = {};
        }
        observerStorage[this.name][eventName][id] = {
            callback
        };
        return () => {
            delete observerStorage[this.name][eventName][id];
            if(observerStorage[this.name][eventName] && Object.keys(observerStorage[this.name][eventName]).length <=0) {
                delete observerStorage[this.name][eventName];
            }
        };
    }
    /**
     * 触发事件
     * @param eventName - 事件名称
     * @param args 参数
     */
    emit(eventName: T, ...args: any[]): void {
        const eventHandlers = observerStorage[this.name][eventName];
        Object.keys(eventHandlers).map((evtId: string) => {
            const callback = eventHandlers[evtId]?.callback;
            typeof callback === "function" && callback.apply(null, args);
        });
    }
    /**
     * 整个事件监听对象销毁
     */
    destory() {
        delete observerStorage[this.name];
    }
}
