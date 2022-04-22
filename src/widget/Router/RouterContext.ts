import { createContext } from "../../context";

export type TypeRouterType = "browser" | "hash" | "memory";
export type TypeRouterContext = {
    listeners: any;
    location: string;
    type: TypeRouterType,
    tempData?: any
};

export const RouterContext = createContext<TypeRouterContext>("RouterContext", {
    listeners: {},
    location: "",
    type: "browser",
    tempData: null
});
