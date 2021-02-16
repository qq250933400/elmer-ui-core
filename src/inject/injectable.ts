import "reflect-metadata";
import { addToClassPool } from "../init/globalUtil";
import { createClassFactory } from "./createClassFactory";
// tslint:disable:variable-name

export const defineReadonlyProperty = (target:any, propertyKey: string, propertyValue: any) => {
    Object.defineProperty(target, propertyKey, {
        configurable: false,
        enumerable: true,
        value: propertyValue,
        writable: false
    });
};

export function injectable(className: string): any {
    if(className === undefined || className === null || className.length<=0) {
        throw new Error("Injectable注入对象必须设置类名。");
    }
     // tslint:disable-next-line:variable-name
    return (_constructor:Function) => {
        const paramTypes: Function[] = Reflect.getMetadata("design:paramtypes",_constructor);
        // 已注册
        // tslint:disable-next-line:curly
        addToClassPool(className, _constructor, () => {
            if(paramTypes) {
                for (const val of paramTypes) {
                    // tslint:disable-next-line:curly
                    if (val === _constructor) {
                        throw new Error("不能依赖自己");
                    } else if (elmerData.classPool.indexOf(val) === -1) {
                        throw new Error(`类【${className}】construct参数${val}没有被注册`);
                    }
                }
            }
        });
    };
}

/**
 * 注解初始化类，在全局生成唯一个对象
 * @param _constructor 初始化类
 * @param classPoolName 全局类唯一识别名称，当类没有使用Injectable时，通过此参数做注册
 */
export function autowired<T>(_constructor:new(...args:any[]) =>T, className?: string, ...argv:any[]): any {
    return (target: any, propertyKey: string): void => {
          target[propertyKey] = createClassFactory(_constructor, {
              argv,
              className
          });
    };
}
