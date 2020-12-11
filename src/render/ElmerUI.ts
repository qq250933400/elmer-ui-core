import "../polyfill";
// tslint:disable-next-line: ordered-imports
import { Common } from "elmer-common";
import { ElmerWorker } from "elmer-worker";
import { EComponent } from "../component/EComponent";
import { ElmerDOM } from "../core/ElmerDom";
import { ElmerEvent } from "../events/ElmerEvent";
import { autowired } from "../inject/injectable";
import { ElmerRender, TypeUIRenderOptions } from "./ElmerRender";
import EventInWorker from "../events/EventInWorker";

export class ElmerUI extends Common {

    @autowired(ElmerDOM)
    private $:ElmerDOM;
    @autowired(ElmerWorker, "ElmerWorker", {
        elmerEvent: new EventInWorker()
    })
    private worker: ElmerWorker;
    // 虚拟事件处理模块，只在最顶层做事件监听，减少对dom的操作
    private eventObj: ElmerEvent;

    constructor() {
        super();
        this.eventObj = new ElmerEvent(this.worker);
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
        this.extend(entryComponent, EComponent.prototype, true, ignorePropKeys);
        this.defineReadOnlyProperty(entryComponent, "props", defaultProps);
        const renderObj = new ElmerRender({
            component: entryComponent,
            container: target,
            event: this.eventObj,
            renderOptions: options,
            path: [0]
        });
        renderObj.render({
            firstRender: true
        }).catch((err) => {
            typeof entryComponent["$error"] === "function" && entryComponent["$error"](err);
        });
        return renderObj;
    }
    dispose(): void {
        this.eventObj.dispose();
    }
}
