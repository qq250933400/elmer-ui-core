import {
    anyValidator,
    arrayValidator,
    booleanValidator,
    dateValidator,
    funcValidator,
    numberValidator,
    objectValidator,
    stringValidator
} from "./validators/dataTypeValidators";

export enum EnumCheckerTypes {
    string  = "string",
    number  = "number",
    array   = "array",
    any     = "any",
    boolean = "boolean",
    bool    = "bool",
    date    = "date",
    func    = "func",
    object  = "object",
    oneOf   = "oneOf",
    oneValueOf  = "oneValueOf",
    oneEnumValueOf = "oneEnumValueOf"
}

export interface IDataTypeChecker extends Function {
    isRequired?: Function;
}
export interface IDataTypeCheckerOption {
    error: Function;
    silence?: boolean;
}
function createRequiredChecker(type: string, validate: Function):Function {
    // tslint:disable-next-line:only-arrow-functions
    const factory = function(value: any, options: IDataTypeCheckerOption): any {
        return validate(value, options);
    };
    (<any>factory).isRequired = ((value: any,options: IDataTypeCheckerOption) => {
        if(value === undefined || value === null) {
            const errMsg = "属性值不能为undefined或null";
            options && typeof options.error === "function" && options.error(errMsg);
            return false;
        }
        return factory(value, options);
    }).bind({factory});
    (<any>factory).type = type;
    (<any>factory).isRequired.type = type;
    return factory;
}
function createDataTypeChecker(type:string): Function {
    function onError(msg: string, fn: Function): void {
        if(fn && typeof fn === "function") {
            fn(msg);
        } else {
            // tslint:disable-next-line:no-console
            console.error(msg);
        }
    }
    function dataTypeChecker(value: any, options:IDataTypeCheckerOption): boolean {
        let validate: Function = null;
        const checkType: EnumCheckerTypes = this.type;
        switch(checkType) {
            case EnumCheckerTypes.string: {
                validate = stringValidator;
                break;
            }
            case EnumCheckerTypes.number: {
                validate = numberValidator;
                break;
            }
            case EnumCheckerTypes.boolean: {
                validate = booleanValidator;
                break;
            }
            case EnumCheckerTypes.bool: {
                validate = booleanValidator;
                break;
            }
            case EnumCheckerTypes.array: {
                validate = arrayValidator;
                break;
            }
            case EnumCheckerTypes.object: {
                validate = objectValidator;
                break;
            }
            case EnumCheckerTypes.func: {
                validate = funcValidator;
                break;
            }
            case EnumCheckerTypes.any: {
                validate = anyValidator;
                break;
            }
            case EnumCheckerTypes.date: {
                validate = dateValidator;
                break;
            }
        }
        if(typeof validate === "function") {
            if(!validate(value, options) && value !== undefined && value !== null) {
                const lType = Object.prototype.toString.call(value);
                !options.silence && onError(`参数类型不匹配,定义类型[${checkType}]，传入值类型${lType}。` + options, (options ? options.error : null));
                return false;
            }
        } else {
            !options.silence && onError(checkType+"未定义validate方法。", (options ? options.error : null));
            return false;
        }
        return true;
    }
    return createRequiredChecker(type, dataTypeChecker.bind({type}));
}

export const createTypeChecker:any = <any>createDataTypeChecker;
