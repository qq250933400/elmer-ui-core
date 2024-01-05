import "reflect-metadata";
import { DECORATORS_FUNDATION_COMPONENTS } from "../decorators/base";
import { Component } from "./Component";

export * from "./Component";
export * from "./Loadable";

type TypeRegisteComponent = {
    selector: string;
    component: Component<any,any,any> | Function;
};

export const declareComponent = (components: TypeRegisteComponent[]) => {
    return (factory: new(...args:any[])=>{}) => {
        const comData: any = {};
        components.forEach((item) => {
            comData[item.selector] = item.component;
        });
        Reflect.defineMetadata(DECORATORS_FUNDATION_COMPONENTS, comData, factory);
        factory.prototype.components = components;
    };
};
