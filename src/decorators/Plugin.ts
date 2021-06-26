import "reflect-metadata";
import { SortHelper } from "../lib/SortHelper";
import utils from "../lib/utils";
import { getServiceObj } from "./Autowired";
import {
    DECORATORS_CLASS_OPTIONS,
    DECORATORS_CLASS_TYPE,
    DECORATORS_CLASS_TYPE_SERVICE,
    DECORATORS_MODEL_ID,
    getAllClassFromPool,
    getExecIndex,
    saveToClassPool,
    setExecIndex,
    TypePluginFundation
} from "./base";

type TypePluginOptions = {
    index?: number;
    token?: string;
};
type TypePluginExecEvent<T = {}> = {
    type: TypePluginFundation;
    name: keyof T;
    token?: string | string[];
    args?: any;
};

/**
 * 定义插件
 * @param enumPluginType - 插件类型
 * @param options - 插件扩展参数
 * @returns - void
 */
export const Plugin = (enumPluginType: TypePluginFundation, options?: TypePluginOptions) => {
    return (Target: new (...args: any[]) => any) => {
        const classType = Reflect.getMetadata(DECORATORS_CLASS_TYPE, Target);
        if (!utils.isEmpty(classType)) {
            throw new Error("PluginRender装饰器不允许混合使用。");
        } else {
            const moduleId = "PluginRender_" + utils.guid();
            Reflect.defineMetadata(DECORATORS_CLASS_TYPE, DECORATORS_CLASS_TYPE_SERVICE, Target);
            Reflect.defineMetadata(DECORATORS_MODEL_ID, moduleId, Target);
            saveToClassPool(enumPluginType as string, Target);
            // --- if has index was setting or options.index is numeric then do the sort
            if (options?.index >= 0) {
                setExecIndex(enumPluginType, []);
            }
            if (options) {
                Reflect.defineMetadata(DECORATORS_CLASS_OPTIONS, options, Target);
            }
        }
    };
};

export const pluginExec = <T={}>(event: TypePluginExecEvent<T>, ...args: any[]): any => {
    const enumPluginType: TypePluginFundation = event.type, methodName: string|(keyof T) = event.name;
    const allPluginFactory = getAllClassFromPool(enumPluginType) || {};
    const execIndexs = getExecIndex(enumPluginType);
    const finalizeIndex = Object.keys(allPluginFactory);
    if (utils.isArray(execIndexs) && execIndexs.length !== finalizeIndex.length) {
        const sortHelper = getServiceObj<SortHelper>(SortHelper);
        sortHelper.bubbleSort(finalizeIndex, {
            compareFn: (pluginId1, pluginId2) => {
                const Plugin1 = allPluginFactory[pluginId1];
                const Plugin2 = allPluginFactory[pluginId2];
                const option1 = Reflect.getMetadata(DECORATORS_CLASS_OPTIONS, Plugin1);
                const option2 = Reflect.getMetadata(DECORATORS_CLASS_OPTIONS, Plugin2);
                const index1 = option1?.index || 0;
                const index2 = option2?.index || 0;
                return index1 === index2 ? 0 : (index1 > index2 ? 1 : -1);
            }
        });
        setExecIndex(enumPluginType, finalizeIndex);
    }
    const execToken = utils.isArray(event.token) ? event.token : (
        !utils.isEmpty(event.token) ? [event.token] : []);
    let lastResult = null;
    let lastPluginId = null;
    finalizeIndex.map((pluginId: string) => {
        const ExecPlugin = allPluginFactory[pluginId];
        const execOption: TypePluginOptions = Reflect.getMetadata(DECORATORS_CLASS_OPTIONS, ExecPlugin);
        const objToken = execOption?.token;
        const isAvailable = utils.isArray(execToken) && execToken.length > 0 ? execToken.indexOf(objToken) >= 0 : true;
        if (isAvailable) {
            // 给插件定义token,当前插件的tokenId在允许执行范围内才执行方法
            const execObj = getServiceObj(ExecPlugin);
            if (typeof execObj[methodName as any] === "function") {
                lastResult = execObj[methodName as any]({
                    ...(event.args || {}),
                    lastPluginId,
                    lastResult,
                    pluginId,
                }, ...args);
                lastPluginId = pluginId;
            }
        }
    });
    return lastResult;
};
