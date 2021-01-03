import "reflect-metadata";
import { formatSelector, registerComponent } from "../core/elmerRegister";
import { addToClassPool } from "../init/globalUtil";
import { IDeclareComponentOptions } from "../interface/IDeclareComponent";
import { I18nController } from "../widget/i18n/i18nController";
import { withRouter } from "../widget/router/withRoter";
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

export function Injectable(className: string): any {
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

export function declareComponent(options: IDeclareComponentOptions): Function {
    // tslint:disable-next-line:typedef
    // tslint:disable-next-line:variable-name
    return (__contructor:Function): void => {
        const i18nController:I18nController = createClassFactory(I18nController);
        __contructor.prototype.selector = formatSelector(options.selector || "");
        // 使用defineReadonlyProperty定义属性，防止用户自定义方法重复定义
        defineReadonlyProperty(__contructor.prototype, "injectModel",options.model);
        defineReadonlyProperty(__contructor.prototype, "injectService",options.service);
        defineReadonlyProperty(__contructor.prototype, "connect",options.connect);
        defineReadonlyProperty(__contructor.prototype, "i18nConfig",options.i18n);
        defineReadonlyProperty(__contructor.prototype, "template",options.template);
        options.components && defineReadonlyProperty(__contructor.prototype, "components", options.components);
        i18nController.initI18n(__contructor, options.i18n);
        if(options.template?.fromLoader) {
            defineReadonlyProperty(__contructor.prototype, "render", (function(): any {
                return this.htmlCode;
            }).bind({htmlCode: options.template.htmlCode}));
        }
        if(options.withRouter) {
           withRouter(__contructor, createClassFactory);
        }
        registerComponent(__contructor, options.selector);
    };
}
