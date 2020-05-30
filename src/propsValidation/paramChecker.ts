import { EnumCheckerTypes ,IDataTypeChecker, IDataTypeCheckerOption } from "./typeChecker";
import { oneEnumValueOfValidator, oneOfValidator, oneValueOfValidator } from "./validators/dataTypeValidators";

function onError(msg: string, fn: Function, params:any): void {
    if(fn && typeof fn === "function") {
        fn(msg, params);
    } else {
        // tslint:disable-next-line:no-console
        console.error(msg, params);
    }
}

function createParamTypeChecker(checkerType: string, types: Array<Function|IDataTypeChecker>):IDataTypeChecker {
    function factory(value: any, options?: IDataTypeCheckerOption): boolean {
        const cType = (<any>factory).type;
        const exOptions:IDataTypeCheckerOption = options ? options : {
            error: null
        };
        let validate = null;
        switch(cType) {
            case EnumCheckerTypes.oneOf: {
                validate = oneOfValidator;
                break;
            }
            case EnumCheckerTypes.oneValueOf: {
                validate = oneValueOfValidator;
                break;
            }
            case EnumCheckerTypes.oneEnumValueOf: {
                validate = oneEnumValueOfValidator;
                break;
            }
        }
        exOptions.silence = true;
        if(typeof validate === "function") {
            if(!validate(value, (<any>factory).checkers, exOptions) && value !== undefined && value !== null) {
                const lType = Object.prototype.toString.call(value);
                const checkTypes = [];
                types.map((tmpChecker:any) => {
                    checkTypes.push(tmpChecker.type);
                });
                const checkTypesStr = checkTypes.join(",");
                onError(`参数类型不匹配,定义类型[${cType}(${checkTypesStr})]，传入值类型${lType}。`, (options ? options.error : null), types);
                return false;
            }
        } else {
            onError(cType+"未定义validate方法。", (options ? options.error : null), types);
            return false;
        }
        return true;
    }
    // tslint:disable-next-line:only-arrow-functions
    (<any>factory).isRequired = function(value: any, options?: IDataTypeCheckerOption): boolean {
        if(value === undefined || value === null || (typeof value === "string" && value.length<=0) ) {
            const errMsg = "属性值不能为undefined或null";
            options && typeof options.error === "function" && options.error(errMsg);
            return false;
        } else {
            return factory(value, options);
        }
    };
    (<any>factory).isRequired.type = checkerType;
    function factoryParamTypeChecker(myCheckerType: string, checkers:Array<Function|IDataTypeChecker>): Function {
        if(!checkers || checkers.length<=0) {
            throw new Error("设置错误，至少设置一个数据类型检查规则。");
        } else {
            (<any>factory).checkers = checkers;
            (<any>factory).type = myCheckerType;
            return factory;
        }
    }
    return <IDataTypeChecker>factoryParamTypeChecker(checkerType, types);
}

export const createParamChecker = createParamTypeChecker;
