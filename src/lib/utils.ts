/**
 * 格式化数字，#字符占位
 * @param val 要格式化的数据
 * @param formatStr 格式化文本
 * @returns 返回数据
 */
const format = (val: number, formatStr: string = "####.##"): string => {
    const valueMatch = val.toString().match(/^(\d*)($|[\.]([\d]{1,}))$/);
    const formatReg = /^([#\,\s]{1,})($|[\.]([#,\s]*))$/;
    if (!formatReg.test(formatStr)) {
        throw new Error("格式化参数设置错误，只允许包含一下字符： '#',',',' '");
    }
    if (valueMatch) {
        const intValue = valueMatch[1];
        const decValue = valueMatch[3];
        const formatMatch = (formatStr || "").match(formatReg);
        const intFormat = formatMatch ? formatMatch[1] : "";
        const decFormat = formatMatch ? formatMatch[3] || "" : "";
        const intLen = intFormat.replace(/[^#]*/g, "").length;
        const decLen = decFormat.replace(/[^#]*/g, "").length;
        const finalInt = intLen > intValue.length ? "0".repeat(intLen - intValue.length) + intValue : intValue; // 整数部分位数不足在最前面补0
        const finalDec = decLen > 0 ? (decLen > decValue.length ? decValue + "0".repeat(decLen - decValue.length) : decValue) : ""; // 小数部分位数不足在最后面补0
        const finalIntResult = [];
        const finalDecResult = [];
        let intRelaceCount = 0, decReplaceCount = 0;
        for (let i = 0; i < intFormat.length; i++) {
            const intChar = intFormat.substr(i, 1);
            if (intChar === "#") {
                finalIntResult.push(finalInt.substr(intRelaceCount, 1));
                intRelaceCount += 1;
            } else {
                finalIntResult.push(intChar);
            }
        }
        if (decFormat.length > 0) {
            for (let i = 0; i < decFormat.length; i++) {
                const intChar = decFormat.substr(i, 1);
                if (intChar === "#") {
                    finalDecResult.push(finalDec.substr(decReplaceCount, 1));
                    decReplaceCount += 1;
                } else {
                    finalDecResult.push(intChar);
                }
            }
        }
        return finalDecResult.length > 0 ? finalIntResult.join("") + "." + finalDecResult.join("") : finalIntResult.join("");
    } else {
        return val.toString();
    }
};

const guid = () => {
    let d = new Date().getTime();
    if (window.performance && typeof window.performance.now === "function") {
        d += performance.now(); // use high-precision timer if available
    }
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        // tslint:disable-next-line: triple-equals
        return (c == "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
};

const getType = (val: any): string => Object.prototype.toString.call(val);
/**
 * 变量是否为空
 * @param val - 检查变量
 * @returns - 返回值
 */
const isEmpty = (val: any): Boolean => (undefined === val || null === val || (typeof val === "string" && val.length <= 0));
/**
 * 是否是Object对象
 * @param val - 检查变量
 * @returns - 返回值
 */
const isObject = (val: any): val is Object => typeof val === "object";
/**
 * 是否为文本
 * @param val - 检查变量
 * @returns - 返回值
 */
const isString = (val: any): val is String => typeof val === "string";
/**
 * 是否为正则表达式对象
 * @param val - 检查变量
 * @returns - 返回值
 */
const isRegExp = (val: any): val is RegExp => getType(val) === "[object RegExp]";
/**
 * 是否为数组
 * @param val - 检查变量
 * @returns - 返回值
 */
const isArray = <T = {}>(val: any): val is T[] => getType(val) === "[object Array]";

const isNumber = (val: any): val is Number => getType(val) === "[object Number]";

const isBoolean = (val: any): val is Boolean => getType(val) === "[object Boolean]";

const isPromise = (val: any): val is Promise<any> => getType(val) === "[object Promise]";

const isNumeric = (val: any): val is Boolean => !isNaN(val);
/** 判断对象是否是Global这个Node环境全局对象 */
const isGlobalObject = (val: any): boolean => getType(val) === "[object global]";

const getRandomText = (len: number = 8):string => {
    if(len > 5) {
        const baseStr = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890";
        let str = "";
        const baseLen = baseStr.length;
        for(let i=0;i<len;i++) {
            const index = Math.floor(Math.random()*baseLen);
            str += baseStr.substr(index, 1);
        }
        return str;
    }
    return "";
};

/** Http */
const toUri = <T={}>(queryStr: string):T => {
    if(!isEmpty(queryStr)) {
        if(isString(queryStr)) {
            const textQuery = queryStr.replace(/^\?/, "").replace(/^\s*/, "").replace(/\#[\s\S]*$/, "");
            const arr = textQuery.split("&");
            const result = {};
            const qVReg = /^([a-z0-9_\-]{1,})=([\s\S]*)$/i;
            for(const qStr of arr) {
                const qMatch = qStr.match(qVReg);
                if(qMatch) {
                    result[qMatch[1]] = decodeURIComponent(qMatch[2]);
                } else {
                    const qKey = qStr.replace(/\=\s*$/, "");
                    result[qKey] = true;
                }
            }
            return result as any;
        } else {
            return queryStr;
        }
    }
};

const toQuery = (obj: any): string => {
    if(obj) {
        const objArr = [];
        Object.keys(obj).map((attrKey) => {
            const attrValue = obj[attrKey];
            const attrStr = attrValue ? (
                isObject(attrValue) ? encodeURIComponent(JSON.stringify(attrValue)) : encodeURIComponent(attrValue)
            ): "";
            objArr.push(`${attrKey}=${attrStr}`);
        });
        return objArr.join("&");
    }
};
const getUri = <T={}>(queryStr: string, key: string): T => {
    const queryObj = toUri(queryStr);
    return queryObj ? queryObj[key] : null;
};

const getValue = <T>(data:object, key:string, defaultValue?: any): T => {
    const keyValue = key !== undefined && key !== null ? key : "";
    if (/\./.test(keyValue)) {
        const keyArr = keyValue.split(".");
        let isFind = false;
        let index = 0;
        let keyStr:any = "";
        let tmpData:any = data;
        while (index <= keyArr.length - 1) {
            keyStr = keyArr[index];
            isFind = index === keyArr.length - 1;
            if(isArray(tmpData) && isNumeric(keyStr)) {
                keyStr = parseInt(keyStr as any, 10);
            }
            if(!isFind) {
                const nextKey = keyArr[keyArr.length - 1];
                if(isArray(tmpData) || isObject(tmpData) || isGlobalObject(tmpData)) {
                    //
                    tmpData = tmpData[keyStr];
                }
                if(tmpData && index === keyArr.length - 2) {
                    if(nextKey === "key") {
                        tmpData = tmpData.key;
                        isFind = true;
                    } else if(nextKey === "length") {
                        tmpData = tmpData.length;
                        isFind = true;
                    }
                }
            } else {
                tmpData = tmpData ? tmpData[keyStr] : undefined;
            }
            if(isFind) {
                break;
            }
            index++;
        }
        return isFind ? (undefined !== tmpData ? tmpData : defaultValue) : defaultValue;
    } else {
        const rResult = data ? (<any>data)[keyValue] : undefined;
        return data ? (undefined !== rResult ? rResult : defaultValue) : defaultValue;
    }
};
/**
 * 给指定对象设置属性值
 * @param data 设置属性值对象
 * @param key 设置属性key,属性key有多层可使用.区分
 * @param value 设置属性值
 * @param fn 自定义设置值回调
 */
const setValue = (data:object, key:string, value:any, fn?: Function): boolean => {
    let isUpdate = false;
    if(!isObject(data)) {
        throw new Error("The parameter of data is not a object");
    }
    if(isEmpty(key)) {
        throw new Error("The key can not be an empty string");
    }
    if(!isEmpty(value)) {
        const keyArr = key.split(".");
        const keyLen = keyArr.length;
        let index = 0;
        let tmpData = data;
        while(index<keyLen) {
            const cKey = keyArr[index];
            if(index < keyLen - 1) {
                // 不是最后一个节点
                if(!isEmpty(tmpData[cKey])) {
                    if(isObject(tmpData[cKey])) {
                        tmpData = tmpData[cKey];
                    } else {
                        throw new Error("Can not set value to attribute of " + cKey);
                    }
                } else {
                    tmpData[cKey] = {};
                    tmpData = tmpData[cKey];
                }
            } else {
                // 要更新数据的节点
                if(typeof fn === "function") {
                    fn(tmpData, cKey, value);
                } else {
                    tmpData[cKey] = value;
                }
                isUpdate = true;
            }
            index++;
        }
    }
    return isUpdate;
};

export default {
    format,
    getRandomText,
    getUri,
    getValue,
    guid,
    isArray,
    isBoolean,
    isEmpty,
    isGlobalObject,
    isNumber,
    isNumeric,
    isObject,
    isPromise,
    isRegExp,
    isString,
    setValue,
    toQuery,
};
