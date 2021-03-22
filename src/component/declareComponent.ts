import { globalVar } from "../core/globalState";
import { IDeclareComponentOptions, IReduxConnect } from "./IDeclareComponent";

const formatSelector = (selectorName: string): string => {
    let dName = selectorName.replace(/([A-Z])/g, "-$1").replace(/^([a-z])/i, "-$1").toLowerCase();
    dName = /^\-/.test(dName) ? dName : "-" + dName;
    dName = "eui" + dName;
    return dName;
};

const registerComponent = (widgets: object | Function, domName?: string) => {
    const register = (widgetFactory: Function, domNameValue?: string) => {
        // tslint:disable-next-line:no-shadowed-variable
        const domName = widgetFactory.toString();
        const fMatch = domName.match(/^function\s*([a-z0-9_\-]*)\s*\(/i);
        const elmerData = globalVar();
        if (fMatch) {
            let dName = fMatch[1];
            dName = domNameValue && domNameValue.length>0 ? domNameValue :  dName;
            dName = formatSelector(dName);
            const saveData = elmerData.components || {};
            if (!saveData[dName]) {
                Object.defineProperty(widgetFactory, "selector", {
                    configurable: false,
                    enumerable: true,
                    value: dName,
                    writable: false
                });
                Object.defineProperty(elmerData.components, dName, {
                    configurable: false,
                    enumerable: true,
                    value: widgetFactory,
                    writable: false
                });
            }
        } else {
            throw new Error("未定义组件名称!");
        }
    };
    if (typeof widgets === "object") {
        Object.keys(widgets).map((wKey) => {
            const factory = (<any>widgets)[wKey];
            if (typeof factory === "function") {
                register(factory, wKey);
            } else {
                throw new Error(`The register component ${wKey} must be a function`);
            }
        });
    } else if (typeof widgets === "function") {
        register(widgets, domName);
    } else {
        throw new Error("The Register component is muse be a constructor or a object");
    }
};

const defineReadonlyProperty = (target:any, propertyKey: string, propertyValue: any) => {
    Object.defineProperty(target, propertyKey, {
        configurable: true,
        enumerable: true,
        value: propertyValue,
        writable: false
    });
};
/**
 * 定义组件，挂载到全局变量
 * @param options
 * @deprecated - 即将弃用此方法,为兼容旧代码
 */
export const declareComponent = (options: IDeclareComponentOptions): Function =>
    // tslint:disable-next-line:typedef
    // tslint:disable-next-line:variable-name
    (__contructor: Function): void => {
        __contructor.prototype.selector = formatSelector(options.selector || "");
        // 使用defineReadonlyProperty定义属性，防止用户自定义方法重复定义
        !__contructor.prototype.injectModel && defineReadonlyProperty(__contructor.prototype, "injectModel", options.model);
        !__contructor.prototype.injectService && defineReadonlyProperty(__contructor.prototype, "injectService", options.service);
        !__contructor.prototype.connect && defineReadonlyProperty(__contructor.prototype, "connect", options.connect);
        defineReadonlyProperty(__contructor.prototype, "i18nConfig", options.i18n);
        defineReadonlyProperty(__contructor.prototype, "template", options.template);
        options.components && defineReadonlyProperty(__contructor.prototype, "components", options.components);
        if (options.template?.fromLoader) {
            defineReadonlyProperty(__contructor.prototype, "render", (function(): any {
                return this.htmlCode;
            }).bind({ htmlCode: options.template.htmlCode }));
        }
        registerComponent(__contructor, options.selector);
    };

export const connect = (options: IReduxConnect) => {
    // tslint:disable-next-line: variable-name
    return (__contructor: Function): void => {
        defineReadonlyProperty(__contructor.prototype, "connect", options);
    };
};

export const inject = (options: { model?: any, service?: any }) => {
    // tslint:disable-next-line: variable-name
    return (__contructor: Function): void => {
        defineReadonlyProperty(__contructor.prototype, "injectModel", options.model);
        defineReadonlyProperty(__contructor.prototype, "injectService", options.service);
    };
};

export const loadComponents = (components: any, callback?: Function) => {
    // tslint:disable-next-line: variable-name
    return (__contructor: Function): void => {
        defineReadonlyProperty(__contructor.prototype, "components", components);
        typeof callback === "function" && defineReadonlyProperty(__contructor.prototype, "__loadComponentCallback__", callback);
    };
};
