import { IEventContext } from "./IEventContext";

type TypeEventListenData = { [ P in Exclude<keyof IEventContext, "eventHandler">]: IEventContext[P] };
type TypeDomEventConfig = { [P in Exclude<keyof TypeEventListenData, "eventName">]: IEventContext[P] } & { events: any };

export type TypeEventIdMapping = {
    eventId: string;
    path: number[];
};

export default class EventInWorker {
    sortEventId(mapData: TypeEventIdMapping[], eventPath: number[]):any {
        if(self["utils"].isArray(mapData)) {
            for(let i=0;i<mapData.length;i++) {
                const checkItem = mapData[i];
                for(let j=i;j<mapData.length;j++) {
                    const mapItem = mapData[j];
                    if(this.isNextPath(checkItem.path, mapItem.path)) {
                        mapData[i] = mapItem;
                        mapData[j] = checkItem;
                    }
                }
            }
            return {
                allPathData: mapData,
                path: eventPath
            };
        } else {
            return {
                allPathData: mapData,
                path: eventPath
            };
        }
    }
    isNextPath(path1: number[], path2: number[]): boolean {
        if(path1.length !== path2.length) {
            return path1.length > path2.length ? false : true;
        } else {
            for(let i=0;i<path1.length;i++) {
                if(path1[i] !== path2[i]) {
                    return path1[i] > path2[i];
                }
            }
        }
    }
    eventHandleSort(eventName: string, srcOptions: TypeDomEventConfig, eventListens: TypeEventListenData[]) {
        const matchEvents: TypeEventListenData[] = [];
        eventListens.map((item) => {
            if(item.eventName === eventName && item.depth <= srcOptions.depth) {
                matchEvents.push(item);
            }
        });
        console.log(srcOptions.depth);
        this.eventHandleSortAction(matchEvents, srcOptions);
    }
    private eventHandleSortAction(matchEvents: TypeEventListenData[], srcOptions: TypeDomEventConfig): void {
        for(let i = 0;i < matchEvents.length;i++) {
            let topEvent = matchEvents[i];
            for(let j=i+1;j<matchEvents.length;j++) {
                const subEvent = matchEvents[j];
                if(this.isTopLevelEvent(topEvent, subEvent)) {
                    matchEvents[i] = subEvent;
                    matchEvents[j] = topEvent;
                    topEvent = subEvent;
                }
            }
        }
        console.log(matchEvents, "afterSearch");
    }
    private isTopLevelEvent(event1: TypeEventListenData, event2: TypeEventListenData): boolean {
        if(event1.depth < event2.depth) {
            return true;
        }
    }
}
