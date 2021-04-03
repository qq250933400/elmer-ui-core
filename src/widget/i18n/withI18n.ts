import { StaticCommon as utils } from "elmer-common";
import { getNode, useCallback,useComponent, useEffect, useState } from "../../hooks";
import { i18nContext } from "./initI18n";

const [ i18nState ] = i18nContext;

type TypeWithI18nOption = {
    i18n?: any;
};

export const withI18n = (option?: TypeWithI18nOption) => {
    return (TargetComponent: Function) => {
        const getI18nData = ((opt) => {
            return ():any => {
                if(i18nState.i18n) {
                    const locale = !utils.isEmpty(i18nState.locale) ? i18nState.locale : i18nState.defaultLocale;
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
        return () => {
            const [ comId ] = useState("comId", () => {
                return "i18nComponent_" + utils.guid();
            });
            const getTargetComponent = getNode(comId);
            useComponent("WithI18nComponent", TargetComponent);
            useCallback((locale: string) => {
                const obj = getTargetComponent();
                let i18nData = getI18nData();
                i18nState.locale = locale;
                i18nData = getI18nData();
                obj.setData({
                    i18n: i18nData
                }, true);
                Object.keys(i18nState.listeners).map((evtId) => {
                    if(evtId !== comId) {
                        // 通知其他调用i18n组件，locale已经被修改
                        i18nState.listeners[evtId]();
                    }
                });
            }, {
                name: "setLocale"
            });
            useEffect((name) => {
                if(name === "didMount") {
                    if(!i18nState.listeners[comId]) {
                        // 注册监听事件
                        i18nState.listeners[comId] = () => {
                            // use it for subscribe locale change event
                            const obj = getTargetComponent();
                            const i18nData = getI18nData();
                            obj.setData({
                                i18n: i18nData
                            }, true);
                        };
                    }
                }
                return () => {
                    // 将事件监听移除
                    delete i18nState.listeners[comId];
                };
            });
            return `<WithI18nComponent id="{{state.comId}}" ...="props" et:setLocale="setLocale"><context /></WithI18nComponent>`;
        };
    };
};
