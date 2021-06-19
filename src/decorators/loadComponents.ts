import "reflect-metadata";
import { Component } from "../component/Component";
import {
    DECORATORS_FUNDATION_COMPONENTS
} from "./base";

export const loadComponents = <T={}>(components: {[P in keyof T]: Function|Component}) => {
    return (target: new(...args:any[]) => any) => {
        Reflect.defineMetadata(DECORATORS_FUNDATION_COMPONENTS, components, target);
    };
};

export const getComponents = <T={}>(ComponentFactory: Function|Component): T => {
    return Reflect.getMetadata(DECORATORS_FUNDATION_COMPONENTS, ComponentFactory) || {};
};
