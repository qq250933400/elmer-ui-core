import "reflect-metadata";
import {
    DECORATORS_CLASS_TYPE,
    DECORATORS_CLASS_TYPE_MODEL,
    DECORATORS_CLASS_TYPE_SERVICE,
    DECORATORS_MODEL_ID,
    getFromObjPool,
    saveToObjPool
} from "./base";

const getClassParams = (Factory: new(...args: any[]) => any): any  => {
    const paramTypes: any[] = Reflect.getMetadata("design:paramtypes",Factory);
    const newParams: any[] = [];
    if(paramTypes?.length > 0) {
        paramTypes.map((param) => {
            const classType = Reflect.getMetadata(DECORATORS_CLASS_TYPE, param);
            if(classType === DECORATORS_CLASS_TYPE_SERVICE) {
                newParams.push(getServiceObj(param as any));
            } else if(classType === DECORATORS_CLASS_TYPE_MODEL) {
                newParams.push(getModelObj(param as any));
            } else {
                newParams.push(param);
            }
        });
    }
    return newParams;
};

export const getServiceObj = <T={}>(Factory: new(...args: any[]) => any, ...args: any[]):T => {
    const serviceId = Reflect.getMetadata(DECORATORS_MODEL_ID, Factory);
    let obj = getFromObjPool(serviceId);
    if(!obj) {
        const params = getClassParams(Factory);
        const newParams = [
            ...params,
            ...args
        ];
        obj = new Factory(...newParams);
        saveToObjPool(serviceId, obj);
    }
    return obj as any;
};

export const getModelObj = <T={}>(Factory: new(...args: any[]) => any, ...args: any[]):T => {
    const modelId = Reflect.getMetadata(DECORATORS_MODEL_ID, Factory);
    const params = getClassParams(Factory);
    const newParams = [
        ...params,
        ...args
    ];
    const obj = new Factory(...newParams);
    obj.id = modelId;
    return obj as any;
};

export const Autowired = (Factory: new(...args: any[]) => any, ...args: any[]) => {
    return (target: any, attrKey: string) => {
        Object.defineProperty(target, attrKey, {
            configurable: false,
            enumerable: true,
            get: () => {
                const type = Reflect.getMetadata(DECORATORS_CLASS_TYPE, Factory);
                let obj = null;
                if(type === DECORATORS_CLASS_TYPE_SERVICE) {
                    obj = getServiceObj(Factory, ...args);
                } else {
                    obj = getModelObj(Factory, ...args);
                }
                return obj;
            },
            set: () => {
                throw new Error("使用Autowired初始化的对象不允许重写.");
            }
        });
    };
};
