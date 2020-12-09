import { StaticCommon as utils } from "elmer-common";
import { ElmerWorker } from "elmer-worker";

type TypeEventIdMapping = {
    eventId: string;
    path: number[];
};
const sortEventId = (mapData: TypeEventIdMapping[]) => {
    console.log(mapData);
};

export class ElmerEvent {
    eventListeners: any = {};

    private worker: ElmerWorker;
    private sortReady: boolean;
    constructor(worker: ElmerWorker) {
        this.worker = worker;
        this.worker.addFunc("eventIDSort", sortEventId).then((resp:any) => {
            if(/^200$/.test(resp.statusCode)) {
                this.sortReady = true;
            } else {
                // tslint:disable-next-line: no-console
                console.error(resp.message);
            }
        }).catch((err) => {
            // tslint:disable-next-line: no-console
            console.error(err, "Not Attached");
        });
    }
    subscribe(eventName: string,path: string[]|number[], callback: Function): string {
        const evtId = "evt_" + utils.guid();
        if(!this.eventListeners[eventName]) {
            const eventCallback = ((evtName: string) => {
                return (evt:Event) => {
                    const tPath:any[] = (evt.target as any).path;
                    const bubbleEvent = {
                        cancelBubble: false,
                        nativeEvent: evt
                    };
                    // const eventData = this.eventListeners[evtName];
                    // if(eventData) {
                    //     Object.keys(eventData).map((evtIDV: string) => {
                    //         const evtObj = eventData[evtIDV];
                    //         const evtPath:any[] = evtObj.path;
                    //         // console.log(evtPath);
                    //     });
                    // }
                    console.log(tPath);
                    this.worker.callMethod("eventIDSort", 12,"333").then((resp:any) => {
                        console.log("call message success");
                    }).catch((err) => {
                        console.error(err);
                    })
                };
            })(eventName);
            this.eventListeners[eventName] = {
                eventHandler: eventCallback,
                eventListener: {},
                mapEventId: []
            };
            this.addEvent(document.body,eventName, eventCallback);
        }
        this.eventListeners[eventName]["eventListener"][evtId] = callback;
        this.eventListeners[eventName].mapEventId.push({
            eventId: evtId,
            path
        });
        console.log(this.eventListeners);
        return evtId;
    }
    unsubscribe(eventId: string): void {
        // remove event listen
    }
    dispose(): void {
        Object.keys(this.eventListeners).map((eventName: string): void => {
            const evtObj = this.eventListeners[eventName];
            Object.keys(evtObj).map((evtId: string) => {
                this.removeEvent(document.body, eventName, evtObj[evtId].callback);
            });
        });
    }
    private addEvent(dom:HTMLElement|Window, eventName: string, callback:Function): void {
        if(dom.addEventListener) {
            dom.addEventListener(eventName, callback as any, {
                passive: true
            });
        } else if((dom as any).attachEvent) {
            (dom as any).attachEvent("on" + eventName, callback);
        }
    }
    private removeEvent(dom:HTMLElement|Window, eventName: string, callback:Function): void {
        if(dom.removeEventListener) {
            dom.removeEventListener(eventName, callback as any);
        } else if((dom as any).detachEvent) {
            (dom as any).detachEvent("on" + eventName, callback);
        }
    }
}
