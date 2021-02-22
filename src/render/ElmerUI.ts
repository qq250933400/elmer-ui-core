// tslint:disable-next-line: ordered-imports
import { Common } from "elmer-common";
import { HtmlParse } from "elmer-virtual-dom";
import { ElmerWorker } from "elmer-worker";
import { Component } from "../component/Component";
import { ElmerDOM } from "../domEvent/ElmerDom";
import { ElmerEvent } from "../events/ElmerEvent";
import EventInWorker from "../events/EventInWorker";
import { autowired } from "../inject/injectable";
import { RenderMiddleware } from "../middleware/RenderMiddleware";
import "../polyfill";
import { ElmerRender, TypeUIRenderOptions } from "./ElmerRender";

export class ElmerUI extends Common {

    @autowired(ElmerDOM)
    private $:ElmerDOM;
    @autowired(ElmerWorker, "ElmerWorker", {
        elmerEvent: new EventInWorker(),
        htmlParse: new HtmlParse()
    })
    private worker: ElmerWorker;
    @autowired(RenderMiddleware)
    private middleware: RenderMiddleware;

    // 虚拟事件处理模块，只在最顶层做事件监听，减少对dom的操作
    private eventObj: ElmerEvent;

    private missionId: string;

    constructor() {
        super();
        this.eventObj = new ElmerEvent(this.worker);
        this.missionId = "__RenderMission__" + this.guid();
    }

    onReady(fn:Function): void {
        this.$.addEvent(window, "load", fn);
    }
    render(target:HTMLElement, rootApp:any, options?:TypeUIRenderOptions): ElmerRender {
        // elmer
        const entryComponent = rootApp || {};
        const ignorePropKeys = ["selector", "template", "model","service","i18n", "connect","setData","setState", "render",
            "$after", "$onPropsChanged", "$afterVirtualRender", "$beforeVirtualRender","$init",
            "$inject", "$before", "$resize", "$dispose"];
        const defaultProps = entryComponent.props || {};
        if(typeof entryComponent.$render !== "function" && typeof entryComponent.render !== "function") {
            entryComponent.$render = () => {
                return options ? options.htmlCode : "<span>Missing render lifecycle method in rootApp object.</span>";
            };
        }
        entryComponent.selector = "RootNode";
        this.extend(entryComponent, Component.prototype, true, ignorePropKeys);
        this.defineReadOnlyProperty(entryComponent, "props", defaultProps);
        const renderObj = new ElmerRender({
            children: [],
            component: entryComponent,
            componentFactory: null,
            container: target,
            event: this.eventObj,
            missionId: this.missionId,
            nodePath: "rootNode",
            path: [0],
            renderOptions: options,
            worker: this.worker
        });
        renderObj.render({
            firstRender: true
        }).then(() => {
            this.middleware.renderDidMount();
        }).catch((err) => {
            typeof entryComponent["$error"] === "function" && entryComponent["$error"](err);
        });
        return renderObj;
    }
    dispose(): void {
        this.eventObj.dispose();
    }
}
