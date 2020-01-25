import { Common } from "elmer-common";

export class WindowResizeListen extends Common {
    listen(): void {
        window.onresize = this.handleOnResize.bind(this);
    }
    handleOnResize(): void {
        const liseners = this.getEventListener();
        const width = window.innerWidth,
            height = window.innerHeight;
        Object.keys(liseners).map((callBackKey) => {
            const callBack = (<any>liseners)[callBackKey];
            this.isFunction(callBack) && callBack(width, height);
        });
    }
    getEventListener(): object {
        const listeners = elmerData.resizeListeners || {};
        return listeners || {};
    }
    remove(id:string): void {
        if (elmerData.resizeListeners) {
            delete (<any>elmerData.resizeListeners)[id];
        }
    }
}
