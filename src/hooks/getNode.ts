import { defineHook, getWikiState, setWikiState, TypeHookStore } from "./hookUtils";

/**
 * 获取节点对象
 * @param id 节点ID
 */
export const getNode = (id: string): Function => {
    return defineHook("getNode", (opt) => {
        if(opt.isInit) {
            const getNodeCallback = ((obj:any, vNodeId: string) => {
                return () => {
                    return obj.dom[vNodeId];
                };
            })(opt.component, id);
            return getNodeCallback;
        } else {
            return opt.returnValue;
        }
    });
};
