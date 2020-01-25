import { Component } from "../core/Component";
import { defineGlobalState } from "../init/globalUtil";
import { declareComponent } from "../inject/injectable";
import { IPropCheckRule, propTypes } from "../propsValidation";

@declareComponent({
    selector: "i18n"
})
export class I18nProvider extends Component {
    static propTypes:any = {
        // tslint:disable-next-line:no-object-literal-type-assertion
        data: <IPropCheckRule>{
            defaultValue: {},
            description: "语言包",
            rule: propTypes.object.isRequired
        },
        // tslint:disable-next-line:no-object-literal-type-assertion
        locale: <IPropCheckRule> {
            defaultValue: "zh",
            description: "语言",
            rule: propTypes.string.isRequired
        },
        // tslint:disable-next-line:no-object-literal-type-assertion
        region: <IPropCheckRule> {
            defaultValue: "CN",
            description: "区域",
            rule: propTypes.string.isRequired
        }
    };
    constructor(props: any) {
        super(props);
        try {
            const tmpLocale = this.initDefaultLocale();
            defineGlobalState("i18n", {
                data: props.data,
                locale: tmpLocale.locale || "zh",
                region: tmpLocale.region || "CN"
            });
        } catch (e) {
            // tslint:disable-next-line:no-console
            console.error(e);
        }
    }
    public render(): string {
        return "<content />";
    }
    private initDefaultLocale(): any {
        let locale = localStorage && typeof localStorage.getItem === "function" ? localStorage.getItem("i18n_locale") : "zh-CN";
        if(this.isEmpty(locale)) {
            locale = window.navigator.language;
            localStorage && typeof localStorage.setItem === "function" && localStorage.setItem("i18n_locale", locale);
        }
        const lArr = locale.split("-");
        return {
            locale: lArr && lArr.length>0 ? lArr[0] : "zh",
            region: lArr && lArr.length>1 ? lArr[1] : "CN",
        };
    }
}
