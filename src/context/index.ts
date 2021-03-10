import { StaticCommon as util } from "elmer-common";
import { useComponent, useContext, useEffect, useState } from "../hooks";

type TypeContextStore<T> = {
    state: T;
    name: string;
    // flag: string;
    on: (callback:Function) => string;
    remove: (eventId: string) => void;
};

const contextStore = {};

export type TypeCreateContextResult<T> = [T, () => Function, TypeContextStore<T> ];

export const CONTEXT_FLAG = "Context_668f5751b331d2a1eec31f2dc0253443";

export const createContext = <T>(contextName: string, initState?: T):TypeCreateContextResult<T> => {
    if(contextStore[contextName]) {
        return [contextStore[contextName].state, contextStore[contextName].withContext, contextStore[contextName]];
    } else {
        const contextData:any = {
            flag: CONTEXT_FLAG,
            listeners: {},
            name: contextName,
            state: {}
        };
        // tslint:disable-next-line: variable-name
        const withContext = ((contextObj, contextNodeName, _initState?: any) => {
            contextObj.state = new Proxy({
                ...(_initState || {})
            }, {
                get(target: any, attr: string): any {
                    return target[attr];
                },
                set(target:any, attr: string, value: any): boolean {
                    if(!util.isEqual(target[attr], value)) {
                        // only data is changed
                        target[attr] = value;
                        Object.keys(contextObj.listeners).map((eventId?: any):any => {
                            const callback = contextObj.listeners[eventId];
                            typeof callback === "function" && callback({name: attr, value}, target);
                        });
                        return true;
                    } else {
                        return false;
                    }
                }
            });
            contextObj.on = (callback: Function): string => {
                const evtId = "contextEvent_" + util.guid();
                contextObj.listeners[evtId] = callback;
                return evtId;
            };
            contextObj.remove = (eventId: string): void => {
                delete contextObj.listeners[eventId];
            };
            return () => {
                return (TargetComponent: Function) => {
                    return () => {
                        const [contextEventId, setUseContentEventId] = useState("contextEventId");
                        const [{}, setContextState] = useState("contextState", () => {
                            return { ...contextObj.state };
                        });
                        useComponent("WithContextComponent", TargetComponent);
                        useEffect((name):any => {
                            if(name === "didMount") {
                                const eventId = contextObj.on(({}, allState) => {
                                    setContextState({
                                        ...allState
                                    });
                                });
                                setUseContentEventId(eventId);
                            }
                            return ():any => {
                                contextObj.remove(contextEventId);
                            };
                        });
                        useContext([contextObj.state, null, contextObj], (newContextData:any) => {
                            setContextState({
                                ...newContextData
                            });
                        });
                        return `<WithContextComponent ...="props" ${contextNodeName}="{{state.contextState}}"><context/></WithContextComponent>`;
                    };
                };
            };
        })(contextData, contextName, initState);
        contextData.withContext = withContext;
        contextStore[contextName] = contextData;
        return [
            contextData.state,
            withContext,
            contextData
        ];
    }
};
