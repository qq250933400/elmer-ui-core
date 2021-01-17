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
}
