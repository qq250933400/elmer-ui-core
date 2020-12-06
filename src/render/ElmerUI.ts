import { Common } from "elmer-common";
import { VirtualElement } from "elmer-virtual-dom";
import { EComponent } from "../component/EComponent";
import { ElmerDOM } from "../core/ElmerDom";
import { autowired } from "../inject/injectable";
import { ElmerRender, TypeUIRenderOptions } from "./ElmerRender";

export class ElmerUI extends Common {

    @autowired(ElmerDOM)
    private $:ElmerDOM;

    onReady(fn:Function): void {
        this.$.addEvent(window, "load", fn);
    }
    render(target:HTMLElement, htmlCode: string|VirtualElement, rootApp:any, options?:TypeUIRenderOptions): ElmerRender {
        // elmer
        const entryComponent = rootApp || {};
        const ignorePropKeys = ["selector", "template", "model","service","i18n", "connect","setData","setState", "render",
            "$after", "$onPropsChanged", "$afterVirtualRender", "$beforeVirtualRender","$init",
            "$inject", "$before", "$resize", "$dispose"];
        const defaultProps = entryComponent.props || {};
        entryComponent.$render = () => {
            return htmlCode;
        };
        this.extend(entryComponent, EComponent.prototype, true, ignorePropKeys);
        this.defineReadOnlyProperty(entryComponent, "props", defaultProps);
        const renderObj = new ElmerRender({
            component: entryComponent,
            container: target,
            renderOptions: options
        });
        renderObj.render().then(() => {
            typeof entryComponent["$didMount"] === "function" && entryComponent["$didMount"]();
        }).catch((err) => {
            typeof entryComponent["$error"] === "function" && entryComponent["$error"](err);
        });
        return renderObj;
    }
}
