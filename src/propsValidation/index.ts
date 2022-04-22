
import { createParamChecker } from "./paramChecker";
import { createTypeChecker,EnumCheckerTypes,  IDataTypeChecker } from "./typeChecker";

export interface IPropValidator {
    rule: IDataTypeChecker | Function;
    defaultValue?: any;
    description?: string;
    propertyKey?: string;
    stateKey?: string;
}

// tslint:disable:variable-name

const string: IDataTypeChecker  = createTypeChecker(EnumCheckerTypes.string);
const number: IDataTypeChecker  = createTypeChecker(EnumCheckerTypes.number);
const array: IDataTypeChecker   = createTypeChecker(EnumCheckerTypes.array);
const boolean: IDataTypeChecker = createTypeChecker(EnumCheckerTypes.boolean);
const object: IDataTypeChecker  = createTypeChecker(EnumCheckerTypes.object);
const func: IDataTypeChecker    = createTypeChecker(EnumCheckerTypes.func);
const any: IDataTypeChecker     = createTypeChecker(EnumCheckerTypes.any);
const date: IDataTypeChecker    = createTypeChecker(EnumCheckerTypes.date);
const bool: IDataTypeChecker    = createTypeChecker(EnumCheckerTypes.bool);

const oneOf = (types:Array<Function|IDataTypeChecker>): IDataTypeChecker => {
    return createParamChecker(EnumCheckerTypes.oneOf, types);
};

const oneValueOf = (enumValues: any[]): IDataTypeChecker => {
    return createParamChecker(EnumCheckerTypes.oneValueOf, enumValues);
};

const enumValueOf = (enumValue: any): IDataTypeChecker => {
    return createParamChecker(EnumCheckerTypes.oneEnumValueOf, enumValue);
};

export const PropTypes = {
    any,
    array,
    bool,
    boolean,
    date,
    enumValueOf,
    func,
    number,
    object,
    oneOf,
    oneValueOf,
    string
};
// tslint:enable:variable-name
