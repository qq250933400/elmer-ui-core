import { utils as StaticCommon } from "elmer-common";
import colorData from "./ElmerColorMapping";

export type TypeAnimationProperty = {
    left?: number|string;
    top?: number|string;
    width?: number|string;
    height?: number|string;
    margin?: number|string;
    marginLeft?: number|string;
    marginTop?: number|string;
    marginRight?: number|string;
    marginBottom?: number|string;
    paddingLeft?: number|string;
    paddingTop?: number|string;
    paddingRight?: number|string;
    paddingBottom?: number|string;
    padding?: number|string;
    borderWidth?: number|string;
    borderLeftWidth?: number|string;
    borderTopWidth?: number|string;
    borderRightWidth?: number|string;
    borderBottomWidth?: number|string;
    borderColor?: string;
    borderLeftColor?: string;
    borderTopColor?: string;
    borderRightColor?: string;
    borderBottomColor?: string;
    backgroundColor?: string;
    color?: string;
    fontSize?: string;
    opacity?: number;
    transformTranslate?: number|string;
    transformTranslate3d?: number|string;
    transformTranslateX?: number|string;
    transformTranslateY?: number|string;
    transformTranslateZ?: number|string;
    transformScale?: number|string;
    transformScale3d?: number|string;
    transformScaleX?: number|string;
    transformScaleY?: number|string;
    transformScaleZ?: number|string;
    transformRotate?: number|string;
    transformRotate3d?: number|string;
    transformRotateX?: number|string;
    transformRotateY?: number|string;
    transformRotateZ?: number|string;
    transformSkew?: number|string;
    transformSkewX?: number|string;
    transformSkewY?: number|string;
};
type TypeAnimationTransformPropertyKeys = "transformTranslate" | "transformTranslate3d" | "transformTranslateX" | "transformTranslateY" | "transformTranslateZ" |
    "transformScalc"  | "transformScalc3d"  | "transformScalcX"  | "transformScalcY"    | "transformScalcZ" |
    "transformRotate" | "transformRotate3d" | "transformRotateX" | "transformRotateY"   | "transformRotateZ" |
    "transformSkew"   | "transformSkewX"    | "transformSkewY";

export type TypeAnimationCssRule = {
    [P in Exclude<keyof TypeAnimationProperty, TypeAnimationTransformPropertyKeys>]: TypeAnimationProperty[P]
} & {
    transform?: string;
    webkitTransform?: string;
    mozTransform?: string;
    msTransform?: string;
    oTransform?: string;
};

export type TypeAnimationContext = {
    cssKey?: string;
    unit?: string;
    value1Unit?: string;
    value2Unit?: string;
    value3Unit?: string;
    value4Unit?: string;
    value1?: number | string | number[] | string[];
    value2?: number | string | number[] | string[];
    value3?: number | string | number[] | string[];
    value4?: number | string | number[] | string[];
};

export type TypeAnimationPropertyData = {[P in keyof TypeAnimationProperty]:TypeAnimationContext };

const rgbToHex = (r:number, g:number, b:number):string => {
    // tslint:disable-next-line: no-bitwise
    const hex = ((r<<16) | (g<<8) | b).toString(16);
    return "#" + new Array(Math.abs(hex.length-7)).join("0") + hex;
};

const hexToRgb = (hex: string): number[] => {
    const rgb: number[] = [];
    let hexStr = hex || "#fff";
    let alph = "";
    if(hexStr.length>=9) {
        alph = hexStr.substr(7,2);
    }
    if(hexStr.length<6) {
        hexStr = "#" + (hexStr.replace(/^#/,"")).repeat(3);
        hexStr = hexStr.substr(0, 7);
    }
    for (let i = 1; i < 7; i += 2) {
        const mData = hexStr.slice(i, i + 2);
        rgb.push(parseInt(mData, 16));
    }
    if(!StaticCommon.isEmpty(alph)) {
        rgb.push(parseInt(alph, 16));
    }
    return rgb;
};
const gradient = (startColor:string, endColor:string, step) => {
    // 将 hex 转换为rgb
    const sColor = hexToRgb(startColor),
        eColor = hexToRgb(endColor);

    // 计算R\G\B每一步的差值
    const rStep = (eColor[0] - sColor[0]) / step,
    gStep = (eColor[1] - sColor[1]) / step,
    bStep = (eColor[2] - sColor[2]) / step;

    const gradientColorArr = [];
    for (let i = 0; i < step; i++) {
        // 计算每一步的hex值
        gradientColorArr.push(rgbToHex(parseInt((rStep * i + sColor[0]).toString(), 10), parseInt((gStep * i + sColor[1]).toString(), 10), parseInt((bStep * i + sColor[2]).toString(), 10)));
    }
    return gradientColorArr;
};

const rgbToNums = (rgbStr: string) => {
    const rgbMatch = rgbStr.match(/^\s*rgb\(([0-9]*)\s*\,\s*([0-9]*)\s*\,\s*([0-9]*)\s*\)\s*/);
    const rgbaMatch = rgbStr.match(/^\s*rgba\(([0-9]*)\s*\,\s*([0-9]*)\s*\,\s*([0-9]*)\s*\,\s*([0-9]*)\s*\)\s*/);
    const result:number[] = [];
    if(rgbaMatch) {
        result.push(parseInt(rgbaMatch[1], 10));
        result.push(parseInt(rgbaMatch[2], 10));
        result.push(parseInt(rgbaMatch[3], 10));
        result.push(parseInt(rgbaMatch[4], 10));
    } else {
        if(rgbMatch) {
            result.push(parseInt(rgbMatch[1], 10));
            result.push(parseInt(rgbMatch[2], 10));
            result.push(parseInt(rgbMatch[3], 10));
        }
    }
    return result;
};
const getTransformValue = (dom:HTMLElement): string => {
    let result = "";
    if(dom) {
        result = dom.style.transform || dom.style.webkitTransform || dom.style["msTransform"] || dom.style["mozTransform"] || dom.style["oTransform"] || "";
    }
    return result;
};
export const isCssEmpty = (cssValue:any):boolean => {
    return cssValue === undefined || cssValue === null;
}
export const calcPropertyData = (resultData: any, key, value: string | number): void => {
    const dResult:TypeAnimationContext = {
        cssKey: key,
        unit: ""
    };
    if(/color$/i.test(key)) {
        dResult.unit = "";
        if(!StaticCommon.isEmpty(value) && StaticCommon.isString(value) && typeof value === "string") {
            const mapValue = value.replace(/^\s*/, "").replace(/\s*$/, "").replace(/\s{2,}/," ");
            const mapList = mapValue.split(" ");
            if(mapList.length>0) {
                if(!isCssEmpty(colorData[mapList[0]])) {
                    mapList[0] = colorData[mapList[0]];
                }
                dResult.value1 = /^#/.test(mapList[0]) ? hexToRgb(mapList[0]) : rgbToNums(mapList[0]);
                if(mapList.length>1) {
                    if(!isCssEmpty(colorData[mapList[1]])) {
                        mapList[1] = colorData[mapList[1]];
                    }
                    dResult.value2 = /^#/.test(mapList[1]) ? hexToRgb(mapList[1]) : rgbToNums(mapList[1]);
                    if(mapList.length>2) {
                        if(!isCssEmpty(colorData[mapList[2]])) {
                            mapList[2] = colorData[mapList[2]];
                        }
                        dResult.value3 = /^#/.test(mapList[2]) ? hexToRgb(mapList[2]) : rgbToNums(mapList[2]);
                        if(mapList.length>3) {
                            if(!isCssEmpty(colorData[mapList[3]])) {
                                mapList[3] = colorData[mapList[3]];
                            }
                            dResult.value4 = /^#/.test(mapList[3]) ? hexToRgb(mapList[3]) : rgbToNums(mapList[3]);
                        }
                    }
                }
            }
        }
    } else {
        if(StaticCommon.isString(value)) {
            // opacity 是一个特殊的属性，当value为空时值是1 transform: translateX() scale()
            if(key !== "opacity") {
                const mapValue = value.replace(/^\s*/, "").replace(/\s*$/, "").replace(/\s{2,}/," ");
                const mapList = /^transform/i.test(key) ? mapValue.split(",") : mapValue.split(" ");
                for(let i=0;i<mapList.length;i++) {
                    let tmpValue = mapList[i];
                    let index = i + 1;
                    if(!isCssEmpty(tmpValue)) {
                        if(/^[\-]{0,1}[0-9\.]*$/.test(tmpValue)) {
                            dResult[`value${index}`] = StaticCommon.isNumeric(tmpValue) && StaticCommon.isString(tmpValue) ? parseFloat(tmpValue) : tmpValue;
                            dResult[`value${index}Unit`] = "";
                        } else if (/^[\-]{0,1}[0-9\.]{1,}([a-z]{1,}|%)$/.test(tmpValue)) {
                            const tmpMatch = tmpValue.match(/^([\-]{0,1}[0-9]{1,})([a-z]{1,}|%)$/);
                            if(tmpMatch) {
                                dResult[`value${index}`] = StaticCommon.isNumeric(tmpMatch[1]) && StaticCommon.isString(tmpMatch[1]) ? parseFloat(tmpMatch[1]) : tmpMatch[1];
                                dResult[`value${index}Unit`] = tmpMatch[2];
                            }
                        }
                    } else {
                        if(key === "opacity") {
                            dResult[`value${index}`] = 1;
                            dResult[`value${index}Unit`] = "";
                        }
                    }
                    tmpValue = null;
                    index = null;
                }
            } else {
                if(/^[0-9\.]{1,}$/.test(value)) {
                    dResult.value1 = parseFloat(value);
                } else {
                    dResult.value1 = 1;
                }
            }
        } else {
            dResult.value1 = value;
        }
    }
    resultData[key] = dResult;
};

export const calcPropertyConfigData = (configData: TypeAnimationProperty):TypeAnimationPropertyData => {
    const result = {};
    if(configData) {
        // tslint:disable-next-line: forin
        for(const key in configData) {
            const cssValue = configData[key];
            calcPropertyData(result, key, cssValue);
        }
    }
    return result;
};

export const readWillChangeCssDefaultData = (dom:HTMLElement, from:TypeAnimationProperty, to:TypeAnimationProperty): TypeAnimationPropertyData => {
    const resultData = {};
    const fromObj = from || {};
    const toObj = to || {};
    if(dom) {
        let allKeys = [...Object.keys(fromObj),...Object.keys(toObj)];
        let transformValue;
        allKeys.map((toKey:string) => {
            if(/^transform/i.test(toKey)) {
                let transKey = toKey.replace(/^transform/i, "");
                transKey = transKey.substr(0,1).toLowerCase() + transKey.substr(1);
                if(transformValue === undefined || transformValue === null) {
                    transformValue = getTransformValue(dom);
                }
                if(!StaticCommon.isEmpty(transformValue)) {
                    const valueReg = new RegExp(`${transKey}\s*\\(([0-9a-z,%\.]*)\\)\s*`, "i");
                    const valueMatch = transformValue.match(valueReg);
                    if(valueMatch) {
                        calcPropertyData(resultData, toKey, valueMatch[1]);
                    } else {
                        resultData[toKey] = {
                            unit: "",
                            value1: 0
                        };
                    }
                }
            } else {
                let value = dom.style.getPropertyValue(toKey);
                if(toKey === "width") {
                    if(dom.clientWidth > 0) {
                        value = dom.clientWidth.toString();
                    }
                } else if(toKey === "height") {
                    if(dom.clientHeight>0) {
                        value = dom.clientHeight.toString();
                    }
                }
                calcPropertyData(resultData, toKey, value);
            }
        });
        allKeys = null;
    }
    return resultData;
};

const getCssValue = (cssKey: string, value?: any, defaultUnit?: string, valueUnit?: string): string => {
    if(!isCssEmpty(value)) {
        if(!/color$/i.test(cssKey)) {
            if(isCssEmpty(valueUnit)) {
                if(!isCssEmpty(defaultUnit)) {
                    return value.toString() + defaultUnit;
                } else {
                    return value.toString();
                }
            } else {
                return value.toString() + valueUnit;
            }
        } else {
            if(StaticCommon.isArray(value)) {
                if(value.length === 3) {
                    return rgbToHex(value[0], value[1], value[2]);
                } else if(value.length === 4) {
                    return `rgba(${value.join(",")})`;
                } else {
                    return value.join(" ");
                }
            } else {
                return value;
            }
        }
    } else {
        return value;
    }
};

export const convertAnimationDataToCssProperty = (animationData: TypeAnimationPropertyData):TypeAnimationCssRule => {
    const cssResult:any = {};
    if(animationData) {
        const transformValues = [];
        // tslint:disable-next-line: forin
        for(const cssKey in animationData) {
            const cssData: TypeAnimationContext = animationData[cssKey];
            const cssValue = [];
            const cssValue1 = getCssValue(cssKey, cssData.value1, cssData.unit, cssData.value1Unit);
            const cssValue2 = getCssValue(cssKey, cssData.value2, cssData.unit, cssData.value2Unit);
            const cssValue3 = getCssValue(cssKey, cssData.value3, cssData.unit, cssData.value3Unit);
            const cssValue4 = getCssValue(cssKey, cssData.value4, cssData.unit, cssData.value4Unit);
            !isCssEmpty(cssValue1) && cssValue.push(cssValue1);
            !isCssEmpty(cssValue2) && cssValue.push(cssValue2);
            !isCssEmpty(cssValue3) && cssValue.push(cssValue3);
            !isCssEmpty(cssValue4) && cssValue.push(cssValue4);
            if(!/^transform/i.test(cssKey)) {
                cssResult[cssKey] = cssValue.join(" ");
                if(cssKey !== "opacity" && /^[0-9\.]{1,}$/.test(cssResult[cssKey])) {
                    // 特殊单位的css，目前只发现opacity是不需要设置单位的
                    cssResult[cssKey] = cssResult[cssKey] + "px";
                }
            } else if(/^transform/i.test(cssKey)) {
                let cssKeyValue = cssKey.replace(/^transform/i, "");
                cssKeyValue = cssKeyValue.substr(0,1).toLowerCase() + cssKeyValue.substr(1);
                transformValues.push(`${cssKeyValue}(${cssValue.join(",")})`);
            }
        }
        if(transformValues.length>0) {
            cssResult["transform"] = transformValues.join(" ");
            cssResult["webkitTransform"] = transformValues.join(" ");
            cssResult["mozTransform"] = transformValues.join(" ");
            cssResult["msTransform"] = transformValues.join(" ");
            cssResult["oTransform"] = transformValues.join(" ");
        }
    }
    return cssResult;
};

export default {
    converAnimationProperty: convertAnimationDataToCssProperty,
    converOption: calcPropertyConfigData,
    gradient,
    hexToRgb,
    readWillChangeCssDefaultData,
    rgbToHex,
};
