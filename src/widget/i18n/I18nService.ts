import { utils } from "elmer-common";
import { Service } from "../../decorators";

type TypeTranslateOption = {
    data?: any;
};

@Service
export class I18nService {
    translate(txt: string, option: TypeTranslateOption): string {
        let txtResult = txt;
        txtResult = this.translateBindData(txt, option.data);
        return txtResult;
    }
    /**
     * 多语言绑定变量
     * @param txt 解析多语言文本
     * @param data 绑定数据对象
     * @returns {string} 返回解析的结果
     */
    private translateBindData(txt: string, data: any): string {
        if(data && !utils.isEmpty(txt)) {
            const bindReg = /\$\{\s*([a-z0-9\-_\.]{1,})\s*\}/ig;
            const bindValueReg = /\$\{\s*([a-z0-9\-_\.]{1,})\s*\}/i;
            const bindMatch = txt.match(bindReg);
            let bindResult = txt;
            if(bindMatch) {
                bindMatch.map((bindValue: string) => {
                    const bindValueMatch = bindValue.match(bindValueReg);
                    if(bindValueMatch) {
                        const bindValueText = bindValueMatch[1];
                        const bindValueData = utils.getValue(data, bindValueText) as any;
                        bindResult = bindResult.replace(bindValue, bindValueData);
                    }
                });
            }
            return bindResult;
        } else {
            return txt;
        }
    }
}
