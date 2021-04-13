/**
 * 格式化数字，#字符占位
 * @param val 要格式化的数据
 * @param formatStr 格式化文本
 * @returns 返回数据
 */
export const format = (val: number, formatStr: string = "####.##"): string => {
    const valueMatch = val.toString().match(/^(\d*)($|[\.]([\d]{1,}))$/);
    const formatReg = /^([#\,\s]{1,})($|[\.]([#,\s]*))$/;
    if(!formatReg.test(formatStr)) {
        throw new Error("格式化参数设置错误，只允许包含一下字符： '#',',',' '");
    }
    if(valueMatch) {
        const intValue = valueMatch[1];
        const decValue = valueMatch[3];
        const formatMatch = (formatStr || "").match(formatReg);
        const intFormat = formatMatch ? formatMatch[1] : "";
        const decFormat = formatMatch ? formatMatch[3] || "" : "";
        const intLen = intFormat.replace(/[^#]*/g,"").length;
        const decLen = decFormat.replace(/[^#]*/g,"").length;
        const finalInt = intLen > intValue.length ? "0".repeat(intLen - intValue.length) + intValue : intValue; // 整数部分位数不足在最前面补0
        const finalDec = decLen > 0 ? (decLen > decValue.length ? decValue + "0".repeat(decLen - decValue.length) : decValue) : ""; // 小数部分位数不足在最后面补0
        const finalIntResult = [];
        const finalDecResult = [];
        let intRelaceCount = 0, decReplaceCount = 0;
        for(let i=0;i<intFormat.length; i++) {
            const intChar = intFormat.substr(i,1);
            if(intChar === "#") {
                finalIntResult.push(finalInt.substr(intRelaceCount, 1));
                intRelaceCount += 1;
            } else {
                finalIntResult.push(intChar);
            }
        }
        if(decFormat.length > 0) {
            for(let i=0;i<decFormat.length; i++) {
                const intChar = decFormat.substr(i,1);
                if(intChar === "#") {
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
