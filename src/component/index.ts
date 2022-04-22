import { Component } from "./Component";

export * from "./Component";
export * from "./Loadable";

type TypeRegisteComponent = {
    selector: string;
    component: Component | Function;
};

export const declareComponent = (components: TypeRegisteComponent[]) => {
    return (factory: new(...args:any[])=>{}) => {
        factory.prototype.components = components;
    };
};
