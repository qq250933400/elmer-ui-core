import { IVirtualElement } from "elmer-virtual-dom";
import { Component, CONST_CLASS_COMPONENT_FLAG } from "../component/Component";
import utils from "../lib/utils";
import renderActions from "./ElmerRenderAction";

export const isNodeComponent = (com:any): com is Component<any,any,any> => {
    const flag = (<any>com)?.flag;
    return flag === CONST_CLASS_COMPONENT_FLAG;
};

type TypeInitizationOptions = {
    vdom: IVirtualElement;
    depth: number;
    registeComponents?(components: any): void;
};

export const Initialization = (ComFactory:Function|Component<any,any,any>, options: TypeInitizationOptions): Object => {
    let renderComponent = null;
    const virtualId = "virtualNode_" + utils.guid();
    const props = options.vdom.props || {};
    const currentDispatchState = {
        Factory: ComFactory,
        component: null,
        hookState: {
            hookIndex: 0,
            state: {}
        },
        isFunc: false,
    };
    const virtualNode = {
        say: "hi"
    };
    options.vdom.virtualID = virtualId;
    if(isNodeComponent(ComFactory)) {
        // 类组件
        renderComponent = new (ComFactory as any)(props, {});
        const renderAction = renderComponent["$render"] || renderComponent.render;
        if(typeof renderAction === "function") {
            renderComponent["$render"] = ((srcRender: Function, target: any, currentDispatch) => {
                // tslint:disable-next-line: only-arrow-functions
                return function():Promise<any> {
                    const newArgs = arguments;
                    currentDispatch.isFunc = false;
                    currentDispatch.component = renderComponent;
                    return renderActions.startRenderDispatch(currentDispatch, () => {
                        const args: any[] = [];
                        for(let i=0;i<newArgs.length;i++) {
                            args.push(newArgs[i]);
                        }
                        args.push(virtualId);
                        return srcRender.apply(target, args);
                    });
                };
            })(renderAction, renderComponent, currentDispatchState);
        } else {
            throw new Error(`自定义组件${options.vdom.tagName}必须定义render函数。`);
        }
    } else {
        // 高阶组件，即是一个函数的静态组件
        renderComponent = {
            dom: {},
            props,
            selector: options.vdom.tagName,
            // tslint:disable-next-line: object-literal-sort-keys
            __factory: ComFactory,
            // tslint:disable-next-line: object-literal-shorthand
            $render: null,
            registeComponents: options.registeComponents
        };
        renderComponent.$render = ((srcRenderAction: Function, currentDispatch) => {
            // tslint:disable-next-line: only-arrow-functions
            return (function(): Promise<any> {
                const newArgs = arguments;
                currentDispatch.isFunc = true;
                currentDispatch.hookState.hookIndex = 0;
                currentDispatch.component = renderComponent;
                return renderActions.startRenderDispatch.call(virtualNode, currentDispatch, () => {
                    const args: any[] = [];
                    for(let i=0;i<newArgs.length;i++) {
                        args.push(newArgs[i]);
                    }
                    return (new Function("Func", "args", "self", `
                    var nodeFunc = (function() {
                        return Func.apply(self, args)
                    }).bind(self);
                    var res = nodeFunc();
                    if(!res) {
                        console.error(Func);
                        throw new Error("函数组件必须返回html代码", Func);
                    }
                    return res;
                    `))(srcRenderAction, args, this);
                });
            }).bind(virtualNode);
        })(ComFactory, currentDispatchState);
    }
    return renderComponent;
};
