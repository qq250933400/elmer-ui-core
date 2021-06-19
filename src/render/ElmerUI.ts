import "../polyfill";
// tslint:disable-next-line: ordered-imports
import { HtmlParse, VirtualNode } from "elmer-virtual-dom";
import { ElmerWorker } from "elmer-worker";
import { Component } from "../component/Component";
import { Autowired, Service } from "../decorators";
import { ElmerRender } from "./ElmerRender2";
import { Initialization } from "./Initialization";

type TypeSupportComponent = Function|Component;
type TypeLoadComponents<T={}> = {[P in keyof T]: TypeSupportComponent};
type TypeRenderOptions = {
    /** 默认引入的自定义组件 */
    components: TypeLoadComponents;
    /** 是否服务端渲染模式 */
    ssr?: boolean;
};

export class ElmerUI {

    @Autowired(VirtualNode)
    private virtualNode: VirtualNode;

    private vRender: ElmerRender;
    onReady(fn: Function): void {
        if(window.addEventListener) {
            window.addEventListener("load", fn as any);
        } else {
            (window as any).attachEvent("onload", fn);
        }
    }
    render(container: HTMLElement, RootApp: TypeSupportComponent, options?: TypeRenderOptions): ElmerRender {
        const entryVirtualNode = this.virtualNode.create("RootNode", {});
        const entryComponent = Initialization(RootApp, {
            vdom: entryVirtualNode
        });
        const vRender = new ElmerRender({
            ComponentFactory: RootApp as any,
            children: [],
            component: entryComponent as any,
            container,
            path: [],
            useComponents: options?.components || {},
            vdom: entryVirtualNode,
        });
        vRender.render({
            firstRender: true,
            state: (entryComponent as any).state
        });
        this.vRender = vRender;
        return vRender;
    }
    destory(): void {
        this.vRender.destory();
    }
}
