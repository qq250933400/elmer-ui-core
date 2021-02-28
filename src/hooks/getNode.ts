import { getWikiState, setWikiState, TypeHookStore } from "./hookUtils";

/**
 * 获取节点对象
 * @param id 节点ID
 */
export const getNode = (id: string): Function => {
    const componentObj = <any>getWikiState("_this");
    const hookStore = <TypeHookStore>getWikiState("hookStore");
    const hookIndex = <any>getWikiState("getNodeIndex");
    if(!hookStore) {
        throw new Error("[useState] Something went wrong!!!");
    }
    if(!hookStore.getNode[hookIndex]) {
        const newGetNode = ((obj: any, nodeId: string):Function => {
            return ():any => {
                return obj.dom[nodeId];
            };
        })(componentObj, id);
        hookStore.getNode[hookIndex] = newGetNode;
        setWikiState("getNodeIndex", hookIndex + 1);
        return newGetNode();
    } else {
        setWikiState("getNodeIndex", hookIndex + 1);
        return hookStore.getNode[hookIndex]();
    }
};
