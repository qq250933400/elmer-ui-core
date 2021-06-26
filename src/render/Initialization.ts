import { IVirtualElement } from "elmer-virtual-dom";
import { Component, CONST_CLASS_COMPONENT_FLAG } from "../component/Component";
import utils from "../lib/utils";
import renderActions from "./ElmerRenderAction";

const isNodeComponent = (com:any): com is Component => {
    const flag = (<any>com)?.flag;
    return flag === CONST_CLASS_COMPONENT_FLAG;
};

type TypeInitizationOptions = {
    vdom: IVirtualElement
};

export const Initialization = (ComFactory:Function|Component, options: TypeInitizationOptions): Object => {
    let renderComponent = null;
    const virtualId = "virtualNode_" + utils.guid();
    const props = options.vdom.props || {};
    const currentDispatchState = {
        component: null,
        hookState: {
            hookIndex: 0,
            state: {}
        },
        isFunc: false
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
            $render: null
        };
        renderComponent.$render = ((srcRenderAction: Function, currentDispatch) => {
            // tslint:disable-next-line: only-arrow-functions
            return function(): Promise<any> {
                const newArgs = arguments;
                currentDispatch.isFunc = true;
                currentDispatch.hookState.hookIndex = 0;
                currentDispatch.component = renderComponent;
                return renderActions.startRenderDispatch(currentDispatch, () => {
                    const args: any[] = [];
                    for(let i=0;i<newArgs.length;i++) {
                        args.push(newArgs[i]);
                    }
                    return srcRenderAction.apply(null, args);
                });
            };
        })(ComFactory, currentDispatchState);
    }
    return renderComponent;
};
