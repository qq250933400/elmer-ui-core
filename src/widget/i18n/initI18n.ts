import { createContext } from "../../context";

import utils from "../../lib/utils";

type TypeSupportLocales = "zh-CN" | "en-GB" | "hk-CN";

export const i18nContext = createContext("i18n", {
    defaultLocale: "zh-CN",
    i18n: {},
    listeners: {},
    locale: null
});

const [i18nState] = i18nContext;

export const getDefaultLocale = ():any => {
    const localStorageValue = localStorage.getItem("locale");
    return !utils.isEmpty(localStorageValue) ? localStorageValue : navigator.language || "zh-CN";
};

export const initI18n = <T = {}>(defaultLocale: keyof T | TypeSupportLocales, localeConfig: {[P in TypeSupportLocales]?: any} & {[C in keyof T]?: any}):void => {
    i18nState.locale = (getDefaultLocale() || defaultLocale || "zh-CN") as any;
    i18nState.i18n = localeConfig;
    i18nState.defaultLocale = getDefaultLocale();
};
