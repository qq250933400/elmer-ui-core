import { Common } from "elmer-common";
import { Injectable } from "../inject/injectable";

@Injectable("ElmerDomEvent")
export class ElmerDomEvent extends Common implements EventListenerObject {
    eventDom: any;
    callBack:Function;
    constructor() {
        super();
    }
    setConfig(dom: HTMLElement, eventHandle: Function): void {
        this.eventDom = dom;
        this.callBack = eventHandle;
    }
    handleEvent():void {
        if(this.isFunction(this.callBack)) {
            const args:any[] = [].slice.call(arguments);
            args.push(this.eventDom);
            this.callBack.apply(this.eventDom, args);
        }
    }
}
