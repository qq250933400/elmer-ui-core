import "reflect-metadata";
import utils from "../lib/utils";

export type TypePluginFundation = "NodeEvent" | "NodeRender";

export const decoratorStorage = {
    classPool: {},
    execIndex: {},
    objPool: {}
};

export const DECORATORS_CLASS_TYPE = "DECORATORS_CLASS_TYPE";
export const DECORATORS_CLASS_TYPE_SERVICE = "DECORATORS_CLASS_SERVICE";
export const DECORATORS_CLASS_TYPE_MODEL = "DECORATORS_CLASS_MODEL";
export const DECORATORS_CLASS_TYPE_RENDER_PLUGIN = "DECORATORS_CLASS_RENDER_PLUGIN"; // 渲染中间件
export const DECORATORS_CLASS_OPTIONS = "";
export const DECORATORS_FUNDATION_COMPONENTS = "DECORATORS_FUNDATION_COMPONENTS"; // 功能性装饰器
export const DECORATORS_MODEL_ID = "DECORATORS_ID";

export const saveToObjPool = (modelId: string, obj: any): void => {
    decoratorStorage.objPool[modelId] = obj;
};

export const getFromObjPool = <T={}>(modelId: string): T => {
    return decoratorStorage.objPool[modelId];
};

/**
 * 将定义类保存到资源池
 * @param type 定义类型
 * @param ClassFactory 类
 */
export const saveToClassPool = (type: string, ClassFactory: new(...args: any) => any): void => {
    const id = Reflect.getMetadata(DECORATORS_MODEL_ID, ClassFactory);
    if(utils.isEmpty(id)) {
        throw new Error("类装饰器定义错误，DECORATORS_ID缺失.");
    } else {
        if(!decoratorStorage.classPool[type]) {
            decoratorStorage.classPool[type] = {};
        }
        decoratorStorage.classPool[type][id] = ClassFactory;
    }
};

/**
 * 从类资源池获取对象
 * @param type 定义Model类型
 * @param id 定义的Model Id
 * @returns any
 */
export const getFromClassPool = (type: TypePluginFundation, id: string): any => {
    return decoratorStorage.classPool[type] ? decoratorStorage.classPool[type][id] : null;
};

export const getAllClassFromPool = (type: TypePluginFundation): any => {
    return decoratorStorage.classPool[type];
};
/**
 * 保存插件执行顺序索引
 * @param type - 插件类型
 * @param index - 执行索引
 */
export const setExecIndex = (type: TypePluginFundation, index: string[]|number[]): void => {
    decoratorStorage.execIndex[type] = index;
};
/**
 * 获取插件执行顺序索引
 * @param type - 插件类型
 * @return - 执行索引
 */
export const getExecIndex = (type: TypePluginFundation): string[]|number[] => {
    return decoratorStorage.execIndex[type];
};
