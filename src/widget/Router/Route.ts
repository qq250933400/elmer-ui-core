import { useComponent, useEffect, useCallback } from "../../hooks";

const RouteContext = ({routeContext}) => {
    return {tagName: "VirtualRootNode", children: routeContext || [], props: {}};
};

export const Route = ({component}, context) => {
    useComponent("RouteContext", RouteContext);
    useEffect((name) => {
        let unsubscribe = null;
        if(name === "didMount") {
            unsubscribe = context.routerContext.subscribe((cstate) => {
                console.log("onContextChange", cstate);
            });
            setTimeout(() => {
                context.routerContext.dispatch({
                    newData: "update to context store"
                });
                console.log(context.routerContext.state);
                console.log("----DispatchContext");
            }, 3000);
        }
        return () => {
            typeof unsubscribe === "function" && unsubscribe();
        }
    })
    console.log(context, "----");

    return `<div class='{{props.config.className}}'>
        <${component} ...="{{props.config.props}}">
            <RouteContext routeContext="{{props.config.children}}" />
        </${component}>
    </div>`;
};
