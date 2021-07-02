import "reflect-metadata";
import {
    DECORATORS_CLASS_TYPE,
    DECORATORS_CLASS_TYPE_MODEL,
    DECORATORS_CLASS_TYPE_SERVICE,
    DECORATORS_MODEL_ID,
    getFromObjPool,
    saveToObjPool
} from "./base";

export const getClassParams = (Factory: new(...args: any[]) => any): any  => {
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

export const getServiceObj = <T={}>(Factory: new(...argv: any[]) => any, ...args: any[]):T => {
    const serviceId = Reflect.getMetadata(DECORATORS_MODEL_ID, Factory);
    const serviceName = Factory.name;
    let obj = getFromObjPool(serviceId);
    if(!obj) {
        const params = getClassParams(Factory);
        const newParams = [
            ...params
        ];
        if(args.length > 0) {
            for(const argv of args) {
                if(argv === Factory) {
                    throw new Error(`(${serviceName})不允许注入自己`);
                } else {
                    const argvType = Reflect.getMetadata(DECORATORS_CLASS_TYPE, argv);
                    if (argvType === DECORATORS_CLASS_TYPE_MODEL) {
                        newParams.push(getModelObj(argv));
                    } else if (argvType === DECORATORS_CLASS_TYPE_SERVICE) {
                        newParams.push(getServiceObj(argv));
                    } else {
                        newParams.push(argv);
                    }
                }
            }
        }
        obj = new Factory(...newParams);
        saveToObjPool(serviceId, obj);
    }
    return obj as any;
};

export const getModelObj = <T={}>(Factory: new(...args: any[]) => any, ...args: any[]):T => {
    const modelId = Reflect.getMetadata(DECORATORS_MODEL_ID, Factory);
    const params = getClassParams(Factory);
    const modelName = Factory.name;
    const newParams = [
        ...params
    ];
    if(args.length > 0) {
        for(const argv of args) {
            if(argv === Factory) {
                throw new Error(`(${modelName})不允许注入自己`);
            } else {
                const argvType = Reflect.getMetadata(DECORATORS_CLASS_TYPE, argv);
                if (argvType === DECORATORS_CLASS_TYPE_MODEL) {
                    newParams.push(getModelObj(argv));
                } else if (argvType === DECORATORS_CLASS_TYPE_SERVICE) {
                    newParams.push(getServiceObj(argv));
                } else {
                    newParams.push(argv);
                }
            }
        }
    }
    const obj = new Factory(...newParams);
    obj.id = modelId;
    return obj as any;
};

export const Autowired = (...args: any[]) => {
    return (target: any, attrKey: string) => {
        const TargetFactory = Reflect.getMetadata("design:type", target, attrKey);
        Object.defineProperty(target, attrKey, {
            configurable: false,
            enumerable: true,
            get: () => {
                const type = Reflect.getMetadata(DECORATORS_CLASS_TYPE, TargetFactory);
                let obj = null;
                if(type === DECORATORS_CLASS_TYPE_SERVICE) {
                    obj = getServiceObj(TargetFactory, ...args);
                } else if(type === DECORATORS_CLASS_TYPE_MODEL) {
                    obj = getModelObj(TargetFactory, ...args);
                } else {
                    throw new Error(`(${TargetFactory.name})当前模块注册类型不适合使用Autowired初始化.`);
                }
                return obj;
            },
            set: () => {
                throw new Error("使用Autowired初始化的对象不允许重写.");
            }
        });
    };
};
