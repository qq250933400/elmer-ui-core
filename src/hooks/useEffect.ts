import { RenderMiddleware } from "../middleware/RenderMiddleware";
import { defineHook } from "./hookUtils";

type TypeUseEffectOptions<P,S> = {
    props: P;
    state: S;
    store?: any;
};
type TypeUseEffectFn<P, S> = (eventName: keyof RenderMiddleware, options: TypeUseEffectOptions<P,S>) => Function|undefined|null|void;

export const useEffect = <P={},S={}>(callback: TypeUseEffectFn<P,S>): void => {
    defineHook("useEffect", (options) => {
        if(options.isInit) {
            const eventOption:any = {
                props: options.component.props,
                state: options.component.state,
                store: {}
            };
            options.onEffect((name, effectEvent) => {
                eventOption.props = effectEvent.props;
                eventOption.state = effectEvent.componentObj?.state;
                const destoryCallback = callback(name, effectEvent as any);
                typeof destoryCallback === "function" && options.onDestory(destoryCallback);
            });
            callback("init", eventOption);
        }
    }, true);
};
