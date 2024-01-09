import { utils } from "elmer-common";
import { useNode, useCallback,useComponent, useEffect, useState } from "../../hooks";
import { getDefaultLocale, i18nContext } from "./initI18n";

const [ i18nState ] = i18nContext;

type TypeWithI18nOption = {
    i18n?: any;
    id?: string;
};

export const setLocale = (locale: string): void => {
    i18nState.locale = locale;
    Object.keys(i18nState.listeners).map((evtId) => {
        // 通知其他调用i18n的组件，locale已经被修改
        i18nState.listeners[evtId]();
    });
    localStorage.setItem("locale", locale);
};

export const withI18n = (option?: TypeWithI18nOption):Function => {
    return (TargetComponent: Function):Function => {
        const getI18nData = ((opt) => {
            return ():any => {
                if(i18nState.i18n) {
                    const defaultLocale = getDefaultLocale();
                    const locale = !utils.isEmpty(i18nState.locale) ? i18nState.locale : defaultLocale;
                    const globalData = i18nState.i18n[locale];
                    const optData = opt && opt.i18n ? opt.i18n[locale] : {};
                    return {
                        ...(globalData || {}),
                        ...(optData || {})
                    };
                } else {
                    return {};
                }
            };
        })(option);
        (TargetComponent as any).i18n = getI18nData();
        const WithI18nComponent = ({}, context) => {
            const [ {}, getComId, comId ] = useState<string>("comId", () => {
                return "i18nComponent_" + utils.guid();
            });
            const getTargetComponent = useNode(getComId());
            const [ {}, getI18nCallback ] = useCallback(() => {
                const i18nData = getI18nData();
                const locale = !utils.isEmpty(i18nState.locale) ? i18nState.locale : getDefaultLocale();
                Object.keys(context).map((contextKey: string) => {
                    if(/^i18n_/.test(contextKey)) {
                        const newI18nFromOption = context[contextKey].state;
                        const newI18n = newI18nFromOption[locale];
                        if(newI18n) {
                            utils.extend(i18nData, newI18n);
                        }
                    }
                });
                return i18nData;
            }, {
                args: [i18nState.locale]
            });
            useComponent("WithI18nComponent", TargetComponent);
            useCallback((locale: string) => {
                const obj = getTargetComponent();
                i18nState.locale = locale;
                obj.setData({
                    i18n: getI18nCallback()
                }, true);
                Object.keys(i18nState.listeners).map((evtId) => {
                    if(evtId !== comId) {
                        // 通知其他调用i18n组件，locale已经被修改
                        i18nState.listeners[evtId]();
                    }
                });
                localStorage.setItem("locale", locale);
            }, {
                name: "setLocale"
            });
            useCallback((localeId: string) => {
                const localeData = getI18nCallback();
                return utils.getValue(localeData as any, localeId);
            }, {
                name: "getI18n"
            });
            useCallback(() => {
                return i18nState.locale || getDefaultLocale();
            }, {name: "getLanguage"});
            useEffect((name, opt) => {
                if(name === "didMount") {
                    if(!i18nState.listeners[comId]) {
                        // 注册监听事件
                        i18nState.listeners[comId] = () => {
                            // use it for subscribe locale change event
                            const obj = getTargetComponent();
                            const i18nData = getI18nCallback();
                            obj.setData({
                                i18n: i18nData
                            }, true);
                        };
                    }
                } else if(name === "init") {
                    if(context) {
                        (TargetComponent as any).i18n = getI18nCallback();
                    }
                }
                return () => {
                    // 将事件监听移除
                    delete i18nState.listeners[comId];
                };
            });
            return `<WithI18nComponent id="{{state.comId}}" ...="{{props}}" language="{{getLanguage()}}" et:getI18n="getI18n" et:setLocale="setLocale"><context /></WithI18nComponent>`;
        };
        if(option?.i18n) {
            const key = "i18n_" + utils.guid();
            WithI18nComponent.$getContext = () => ({
                data: option.i18n,
                name: key
            });
        }
        return WithI18nComponent;
    };
};
