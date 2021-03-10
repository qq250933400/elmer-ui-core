import { CONTEXT_FLAG, TypeCreateContextResult } from "../context";
import { defineHook } from "./hookUtils";

/**
 * 使用context hook函数
 * @param createContextResponse
 * @param callback - this callback will be called when context has changed.
 */
export const useContext = <T>(createContextResponse: TypeCreateContextResult<T>, callback?: Function) => {
    if(!createContextResponse || !createContextResponse[2] || (createContextResponse[2] as any)?.flag !== CONTEXT_FLAG) {
        throw new Error("useContext got an wrong argument of createContextResponse, should be the createContext returned value.");
    }
    defineHook("useContext", (event) => {
        if(event.isInit) {
            const contextObj = createContextResponse[2];
            contextObj.on(() => {
                if(typeof event.component["$willReceiveProps"] === "function") {
                    const newProps = {
                        ...(event.component.props || {}),
                    };
                    newProps[contextObj.name] = {
                        ...(createContextResponse[0] || {})
                    };
                    event.component["$willReceiveProps"](newProps);
                }
                typeof callback === "function" && callback({
                    ...(createContextResponse[0] || {})
                });
            });
        }
    });
    return {
        ...(createContextResponse[0] || {})
    };
};
