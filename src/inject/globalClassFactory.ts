import { StaticCommon } from "elmer-common";
import "reflect-metadata";

export type TypeAutowiredOptions = {
    className?: string;
    argv?: any[]
};
// 实例化工厂
// tslint:disable-next-line:variable-name
export function globalClassFactory<T>(_constructor: new(...args:any[]) =>T, options?: string | TypeAutowiredOptions):T {
    let className = _constructor.prototype.className;

    const paramTypes:Function[] = Reflect.getMetadata("design:paramtypes",_constructor);
    let argv: any[] = [];
    let classPoolName;
    if(StaticCommon.isEmpty(className)) {
        if(!StaticCommon.isEmpty(options)) {
            if(StaticCommon.isString(options)) {
                className = options;
                classPoolName = options;
            } else {
                className = options.className;
                classPoolName = options.className;
            }
        }
    }
    if(!StaticCommon.isEmpty(options) && StaticCommon.isObject(options)) {
        argv = options.argv || [];
    }
    if(!StaticCommon.isEmpty(classPoolName)) {
        if(!elmerData.classPool[classPoolName]) {
            elmerData.classPool[classPoolName] = _constructor;
        }
    }
    if(StaticCommon.isEmpty(className)) {
        className = _constructor["className"];
    }
    if(!elmerData.objPool[className]) {
        // 参数实例化
        const paramInstance = Object.prototype.toString.call(paramTypes) === "[object Array]" ? paramTypes.map((val:Function) => {
            // 依赖的类必须全部进行注册
            if(elmerData.classPool.indexOf(val) === -1) {
                throw new Error(`${val}没有被注册[${className}]`);
            } else {
                return globalClassFactory(val as any);
            }
        }) : [];
        const obj = new _constructor(...(Array.concat(paramInstance, argv)));
        elmerData.objPool[className] = obj;
        return obj;
    } else {
        return elmerData.objPool[className];
    }
}

export const autoInit = globalClassFactory​​;
