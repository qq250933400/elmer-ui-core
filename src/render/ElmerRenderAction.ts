import { Component } from "../component/Component";

type TypeCurrentRenderDispatch = {
    component: any;
    hookState: {
        hookIndex: number;
        state: any;
    },
    isFunc: Boolean;
};

const renderDispatch = {
    current: null
};

const callLifeCycle = (component: any, methodName: keyof Component, ...args:any[]):void => {
    if(typeof component[methodName] === "function") {
        component[methodName].apply(component, args);
    }
};

const startRenderDispatch = (dispatchActions: any, renderCallback: Function): Promise<any> => {
    return new Promise<any>((resolve) => {
        if(!renderDispatch.current) {
            renderDispatch.current = dispatchActions;
            resolve(renderCallback());
            renderDispatch.current = null;
        } else {
            const timerTick = setInterval(() => {
                if(!renderDispatch.current) {
                    renderDispatch.current = dispatchActions;
                    resolve(renderCallback());
                    renderDispatch.current = null;
                    clearInterval(timerTick);
                }
            }, 10);
        }
    });
};

const getCurrentRenderDispatch = (): TypeCurrentRenderDispatch => renderDispatch.current;

export default {
    callLifeCycle,
    getCurrentRenderDispatch,
    startRenderDispatch
};
