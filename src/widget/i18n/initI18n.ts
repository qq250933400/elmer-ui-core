import { createContext } from "../../context";

type TypeSupportLocales = "zh-CN" | "en-GB" | "hk-CN";

export const i18nContext = createContext("i18n", {
    defaultLocale: "zh-CN",
    i18n: {},
    listeners: {},
    locale: "zh-CN"
});

const [i18nState] = i18nContext;

export const initI18n = <T = {}>(defaultLocale: keyof T | TypeSupportLocales, localeConfig: {[P in TypeSupportLocales]?: any} & {[C in keyof T]?: any}):void => {
    i18nState.locale = (defaultLocale || "zh-CN") as any;
    i18nState.i18n = localeConfig;
};
