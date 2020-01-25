import { IDataTypeCheckerOption } from "../typeChecker";

const getDataType = (value: any) => {
    return Object.prototype.toString.call(value);
};
export const anyValidator = (): boolean => {
    return true;
};

export const stringValidator = (value: any, options: any): boolean => {
    return typeof value === "string";
};

export const arrayValidator = (value: any): boolean => {
    return getDataType(value) === "[object Array]";
};

export const numberValidator = (value: any): boolean => {
    return getDataType(value) === "[object Number]";
};

export const booleanValidator = (value: any): boolean => {
    return getDataType(value) === "[object Boolean]";
};

export const objectValidator = (value: any): boolean => {
    return getDataType(value) === "[object Object]";
};

export const funcValidator = (value: any): boolean => {
    return getDataType(value) === "[object Function]";
};

export const dateValidator = (value: any): boolean => {
    return getDataType(value) === "[object Date]";
};

export const oneOfValidator = (value: any, typeCheckers: Function[], options:IDataTypeCheckerOption): boolean => {
    if(getDataType(typeCheckers) === "[object Array]") {
        // tslint:disable-next-line:forin
        for(let tmpKey=0;tmpKey<typeCheckers.length;tmpKey++) {
            const tmpChecker = typeCheckers[tmpKey];
            if(tmpChecker(value, options)) {
                return true;
            }
        }
    }
    return false;
};

export const oneValueOfValidator = (value: any, checkEnumValues: any[], options:IDataTypeCheckerOption): boolean => {
    return checkEnumValues && checkEnumValues.length>0 ? checkEnumValues.indexOf(value) >= 0 : false;
};

export const oneEnumValueOfValidator = (value: any, checkEnumObj: any) => {
    if(getDataType(checkEnumObj) === "[object Object]") {
        for(const key in checkEnumObj) {
            if(checkEnumObj[key] === value) {
                return true;
            }
        }
    }
    return false;
};
