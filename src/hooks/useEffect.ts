import { RenderMiddleware } from "../middleware/RenderMiddleware";
import { defineHook } from "./hookUtils";

type TypeUseEffectOptions<P,S> = {
    props: P;
    state: S
};
type TypeUseEffectFn<P, S> = (eventName: keyof RenderMiddleware, options: TypeUseEffectOptions<P,S>) => Function|undefined|null;

export const useEffect = <P={},S={}>(callback: TypeUseEffectFn<P,S>): void => {
    defineHook("useEffect", (options) => {
        if(options.isInit) {
            options.onEffect((name, effectEvent) => {
                const destoryCallback = callback(name, effectEvent as any);
                typeof destoryCallback === "function" && options.onDestory(destoryCallback);
            });
        }
    }, true);
};
