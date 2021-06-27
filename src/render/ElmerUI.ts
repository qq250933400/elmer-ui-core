import "../polyfill";
// tslint:disable: ordered-imports
import { VirtualNode, HtmlParse } from "elmer-virtual-dom";
import { queueCallFunc } from "elmer-common";
import { Component } from "../component/Component";
import { Autowired } from "../decorators";
import { ElmerRender } from "./ElmerRender2";
import { Initialization } from "./Initialization";
import { decoratorStorage } from "../decorators/base";
import { ElmerWorker } from "elmer-worker";
import { EventInWorker } from "../events/EventInWorker";
import elmerRenderAction from "./ElmerRenderAction";
import { ElmerRenderNode } from "./ElmerRenderNode";

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

    @Autowired(HtmlParse)
    private htmlParse: HtmlParse;

    @Autowired(EventInWorker)
    private eventInWorker: EventInWorker;

    @Autowired(ElmerWorker)
    private worker: ElmerWorker;

    @Autowired(ElmerRenderNode)
    private renderNode: ElmerRenderNode;

    private vRender: ElmerRender;
    private onReadyCallbacks: any = [];
    private isDocumentReady: boolean = false;
    private isWorkerReady: boolean = false;
    constructor() {
        this.workerInitialization();
    }
    onReady(fn: Function): void {
        this.onReadyCallbacks.push(fn);
        if(window.addEventListener) {
            window.addEventListener("load", this.onWindowReady.bind(this) as any);
        } else {
            (window as any).attachEvent("onload", this.onWindowReady.bind(this));
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
            nextSibling: null,
            path: [],
            previousSibling: null,
            useComponents: options?.components || {},
            vdom: entryVirtualNode
        });
        vRender.render({
            firstRender: true,
            state: (entryComponent as any).state
        }).then(() => {
            elmerRenderAction.connectNodeRender({
                container,
                sessionId:entryVirtualNode.virtualID,
                vRender,
                vdom: entryVirtualNode,
                vdomParent: entryVirtualNode,
                // tslint:disable-next-line: object-literal-sort-keys
                getRenderSession: this.renderNode.getSessionAction.bind(this.renderNode)
            });
        }).catch((err) => {
            // tslint:disable-next-line: no-console
            console.error(err);
            // ignoreelmerRenderAction.callLifeCycle(entryComponent, "")
        });
        this.vRender = vRender;
        // tslint:disable-next-line: no-console
        console.log(decoratorStorage);
        return vRender;
    }
    destory(): void {
        this.vRender.destory();
    }
    private workerInitialization(): void {
        queueCallFunc([
            {
                id: "htmlParse",
                params: this.htmlParse
            }, {
                id: "eventObj",
                params: this.eventInWorker
            }
        ], (opt, obj) => {
            return this.worker.addObject(opt.id, obj);
        }).then(() => {
            this.isWorkerReady = true;
            this.onAllReady();
        }).catch((err) => {
            // tslint:disable-next-line: no-console
            console.error(err);
        });
    }
    private onWindowReady(): void {
        this.isDocumentReady = true;
        this.onAllReady();
    }
    private onAllReady(): void {
        if(
            this.isWorkerReady &&
            this.isDocumentReady
        ) {
            for(const fn of this.onReadyCallbacks) {
                try {
                    fn();
                } catch(e) {
                    // tslint:disable-next-line: no-console
                    console.error(e);
                }
            }
        }
    }
}

// tslint:enable: ordered-imports
