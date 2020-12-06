import { Common } from "elmer-common";
import { HtmlParse, IVirtualElement, VirtualRender } from "elmer-virtual-dom";
import { EComponent } from "../component/EComponent";
import { autowired } from "../inject";

export type TypeUIRenderOptions = {
    isRSV?: boolean; // Render first init
};

type TypeElmerRenderOptions = {
    component: EComponent;
    container: HTMLElement;
    renderOptions: TypeUIRenderOptions;
};

export class ElmerRender extends Common {

    @autowired(VirtualRender)
    private virtualRender: VirtualRender;
    @autowired(HtmlParse)
    private htmlParse: HtmlParse;

    private options: TypeElmerRenderOptions;
    private sourceDom: IVirtualElement;
    private oldDom: IVirtualElement;
    constructor(options: TypeElmerRenderOptions) {
        super();
        this.options = options;
        typeof this.options?.component?.$init === "function" && this.options?.component?.$init();
    }
    async render():Promise<any> {
        return new Promise<any>((resolve, reject) => {
            try {
                typeof this.options.component.$before === "function" && typeof this.options.component.$before();
                if(!this.sourceDom) {
                    let vdom:IVirtualElement;
                    if(typeof this.options.component.$render === "function") {
                        vdom = this.options.component.$render();
                    } else if(typeof this.options.component["render"] === "function") {
                        vdom = this.options.component["render"];
                    } else {
                        vdom = this.options.component["templateCode"];
                    }
                    if(this.isString(vdom)) {
                        vdom = this.htmlParse.parse(vdom);
                    }
                    this.sourceDom = vdom;
                }
                // 准备渲染虚拟dom，做数据绑定和diff运算
                typeof this.options.component.$beforeVirtualRender === "function" && this.options.component.$beforeVirtualRender(this.sourceDom);
                const renderDom = this.virtualRender.render(this.sourceDom, this.oldDom, this.options.component);
                typeof this.options.component.$afterVirtualRender === "function" && this.options.component.$afterVirtualRender(renderDom);
                console.log(renderDom);
            } catch(e) {
                // tslint:disable-next-line: no-console
                console.error(e);
                reject({
                    message: e.message,
                    statusCode: "T_500"
                });
            }
        });
    }
}
