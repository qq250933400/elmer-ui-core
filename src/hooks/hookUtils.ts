import { StaticCommon as utils } from "elmer-common";

export type TypeHookStore = {
    useState: any;
    useCallback: any;
    useComponent: any;
    useEffect: any;
    getNode: any;
};

export const wikiState: any = {};

export const getWikiState = <T>(key: string): T => {
    const missionId = wikiState["missionId"];
    const missionObj = wikiState[missionId];
    return missionObj ? missionObj[key] : null;
};

export const setWikiState = (key: string, value:any): void => {
    const missionId = wikiState["missionId"];
    let missionObj = wikiState[missionId];
    if(!missionObj) {
        missionObj = {};
        wikiState[missionId] = missionObj;
    }
    utils.setValue(missionObj, key, value);
};

export const getCurrentMissionId = (): string => {
    return wikiState["missionId"];
};
