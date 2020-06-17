import { Common } from "elmer-common";
import { defineGlobalState, getGlobalState } from "../init/globalUtil";
import { autowired } from "../inject/injectable";
import { IComponent } from "../interface/IComponent";
import { TypeUIRenderOptions } from "../interface/IElmerRender";
import { Component } from "./Component";
// tslint:disable-next-line:ordered-imports
import { ElmerDOM } from "./ElmerDom";
import { ElmerRender } from "./ElmerRender";
import { WindowResizeListen } from "./ElmerResize";

export class ElmerUI extends Common {
    @autowired(ElmerDOM)
    private $:ElmerDOM;
    constructor() {
        super();
        if (document && document.body && !this.$.hasClass(document.body,"elmerTheme")) {
            this.$.addClass(document.body, "elmerTheme");
        }
    }
    render(target: HTMLElement, htmlCode: string, bindComponent?: object | null, options?: TypeUIRenderOptions): any {
        if (this.isDOM(target)) {
            const ignorePropKeys = ["selector", "template", "model","service","i18n", "connect","setData","setState", "render",
            "$after", "$onPropsChanged", "$afterVirtualRender", "$afterDiff","$beforeVirtualRender","$beforeDiff","$init",
            "$inject", "$before", "$resize", "$dispose"];
            const handler: any = bindComponent || {};
            const defaultProps = handler.props || {};
            this.extend(handler, Common.prototype);
            this.extend(handler, Component.prototype, true, ignorePropKeys);
            this.defineReadOnlyProperty(handler, "props", defaultProps);
            const render = new ElmerRender({
                component: (<IComponent>handler),
                context: {
                    renderStore: {
                        options
                    }
                },
                htmlCode,
                uiRenderOptions: options,
                virtualId: "root",
                virtualTarget: target
            });
            handler.dom = {};
            handler["render"] = () => {
                return htmlCode;
            };
            if(!getGlobalState​​("renderOptions")) {
                defineGlobalState​​("renderOptions", options || {});
            }
            // tslint:disable-next-line: no-floating-promises
            render.render(true);
            if(options && options.isRSV) {
                this.setValue(getGlobalState​​("renderOptions"), "rsvAttachDom", true);
            }
            typeof (<IComponent>handler).$didMount === "function" && (<IComponent>handler).$didMount();
            return render;
        } else {
            // tslint:disable-next-line:no-console
            console.error("render方法指定参数target不是一个有效的dom", target, htmlCode);
        }
    }
}

export const addResize = (id: string, callBack: Function) => {
    const sender = new WindowResizeListen();
    const liseners: any = sender.getEventListener();
    liseners[id] = callBack;
    elmerData.resizeListeners = liseners;
};

export const removeResize = (id: string) => {
    const sender = new WindowResizeListen();
    sender.remove(id);
};
