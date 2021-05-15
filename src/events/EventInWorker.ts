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
    /**
     * the event subscribe time not align with the dom render list, so we need do the sort of all the event handler
     * @param eventName the event type
     * @param srcOptions the event source element's virtual node information
     * @param eventListens the event listeners for all event handler
     */
    eventHandleSort(eventName: string, srcOptions: TypeDomEventConfig, eventListens: TypeEventListenData[]) {
        const matchEvents: TypeEventListenData[] = [];
        const srcVirtalNodePath = srcOptions.path;
        const srcVirtualNodePathLen = srcVirtalNodePath.length;
        const isAnimationEndEvent = /animationEnd$/i.test(eventName);
        const isTransitionEndEvent = /transitionEnd$/i.test(eventName);
        eventListens.map((item) => {
            const itemVirtualPathLen = item.path.length;
            let isEventTypeMatched = item.eventName === eventName;
            let isMathedEvent = false;
            // 特殊事件处理
            if(isAnimationEndEvent) {
                isEventTypeMatched = /animationEnd$/i.test(item.eventName);
            }
            if(isTransitionEndEvent) {
                isEventTypeMatched = /transitionEnd$/i.test(item.eventName);
            }

            if(isEventTypeMatched && item.depth <= srcOptions.depth &&
                item.virtualPath.substr(0, srcOptions.virtualPath.length) <= srcOptions.virtualPath
                ) {
                if(item.depth === srcOptions.depth) {
                    if(item.path.length < srcOptions.path.length || item.path === srcOptions.path) {
                        isMathedEvent = true;
                        // this is the event handle of the event source element that bind to the component
                    }
                } else {
                    // event go side to out
                    isMathedEvent = true;
                }
            }
            if(isMathedEvent) {
                if(itemVirtualPathLen <= srcVirtualNodePathLen) {
                    const newSrcNodePath = JSON.parse(JSON.stringify(srcVirtalNodePath));
                    // only the parent node can accept the event action
                    newSrcNodePath.splice(itemVirtualPathLen, srcVirtualNodePathLen - itemVirtualPathLen + 1);
                    if(JSON.stringify(newSrcNodePath) === JSON.stringify(item.path)) {
                        matchEvents.push(item);
                    }
                }
            }
        });

        this.eventHandleSortAction(matchEvents, srcOptions);
        return matchEvents;
    }
    resizeEventSortAction(events: TypeEventListenData[]): any {
        const allEvents = [];
        for(const evt of events) {
            if(evt.eventName === "resize") {
                allEvents.push(evt);
            }
        }
        this.eventHandleSortAction(allEvents, {} as any);
        return allEvents;
    }
    private eventHandleSortAction(matchEvents: TypeEventListenData[], srcOptions: TypeDomEventConfig): void {
        for(let i = 0;i < matchEvents.length;i++) {
            let topEvent = matchEvents[i];
            for(let j=i+1;j<matchEvents.length;j++) {
                const subEvent = matchEvents[j];
                if(this.isTopLevelEvent(topEvent, subEvent, srcOptions)) {
                    matchEvents[i] = subEvent;
                    matchEvents[j] = topEvent;
                    topEvent = subEvent;
                }
            }
        }
    }
    private isTopLevelEvent(event1: TypeEventListenData, event2: TypeEventListenData, srcEvent: TypeDomEventConfig): boolean {
        if(event1.depth < event2.depth) {
            return true;
        } else if (event1.depth === event2.depth) {
            if(event1.path.length < event2.path.length) {
                return true;
            }
        }
    }
}
