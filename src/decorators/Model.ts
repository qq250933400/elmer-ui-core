import "reflect-metadata";
import utils from "../lib/utils";
import {
    DECORATORS_CLASS_TYPE,
    DECORATORS_CLASS_TYPE_MODEL,
    DECORATORS_MODEL_ID
} from "./base";

export const Model = (Target: new(...args: any[]) => any) => {
    const type = Reflect.getMetadata(DECORATORS_CLASS_TYPE, Target);
    if(!utils.isEmpty(type)) {
        if(type !== DECORATORS_CLASS_TYPE_MODEL) {
            throw new Error("类装饰器定义冲突，不允许同时使用两个类装饰器。");
        }
    } else {
        const modelId = "decorator_service_" + utils.guid();
        Reflect.defineMetadata(DECORATORS_CLASS_TYPE, DECORATORS_CLASS_TYPE_MODEL, Target);
        Reflect.defineMetadata(DECORATORS_MODEL_ID, modelId, Target);
    }
};
