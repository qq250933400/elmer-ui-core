import { Common } from "elmer-common";
import { IComponent } from "../component/IComponent";
import { addToClassPool, getGlobalState } from "../init/globalUtil";
import { IDeclareI18n } from "../interface/IDeclareComponent";

export class I18nController extends Common {
    constructor() {
        super();
        this.initI18n({ prototype: this }, {}); // 给自身初始化一个配置信息以便全局使用controller
    }
    /**
     * 在declareComponent时执行一次即可，创建component实例在执行，执行次数太多
     * @param ComponentClass Component 定义的Component
     * @param configData object 配置参数
     */
    initI18n(ComponentClass: any, configData: IDeclareI18n): void {
        this.initI18nConfig(ComponentClass.prototype, configData);
    }
    initI18nTranslate(targetComponent: IComponent): any {
        this.defineReadOnlyProperty(targetComponent, "translate", this.translate.bind(targetComponent));
    }
    private initI18nConfig(ComponentPrototype: any, configData: IDeclareI18n): void {
        let dataKey = this.getValue(configData, "key", "");
        let localeData  = this.getLocaleData(configData ? configData.locale : null);
        let locale = localeData.locale;
        let rootKey = this.isEmpty(dataKey) ? `i18n.data.${locale}` : `i18n.data.${locale}.${dataKey}`;
        this.defineReadOnlyProperty(ComponentPrototype, "i18nLocale", locale);
        this.defineReadOnlyProperty(ComponentPrototype, "i18nRegion", localeData.region);
        this.defineReadOnlyProperty(ComponentPrototype, "i18nRootKey", rootKey);
        if(configData && configData.data) {
            this.defineReadOnlyProperty(ComponentPrototype, "i18nData", configData.data);
        }
        locale = null;
        rootKey = null;
        dataKey = null;
        localeData = null;
    }

    private getLocaleData(overrideLocale: string): any {
        const locale = !this.isEmpty(overrideLocale) ? overrideLocale : (localStorage && this.isFunction(localStorage.getItem) ? localStorage.getItem("i18n_locale") || "": "" );
        const lArr = (locale || "").split("-");
        return {
            locale: lArr && lArr.length>0 ? lArr[0] : "zh",
            region: lArr && lArr.length>1 ? lArr[1] : "CN"
        };
    }
    private translate(key: string): any {
        const privateKey = "i18nData." + this["i18nLocale"] + "." + key;
        const privateResult = this.getValue(this, privateKey);
        if(!this.isEmpty(privateResult)) {
            return privateResult;
        } else {
            const defineKey  = this.getValue(this, "i18nRootKey") + "." + key;
            return this.getValue(elmerData.elmerState, defineKey, `{{${defineKey}}}`);
        }
    }
}

/**
 * 直接使用此方法替换不能使用injectable装饰器
 */
addToClassPool("I18nController", I18nController);
