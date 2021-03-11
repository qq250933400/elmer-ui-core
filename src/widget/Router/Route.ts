import { useComponent, useEffect, useCallback } from "../../hooks";

const RouteContext = ({routeContext}) => {
    return {tagName: "VirtualRootNode", children: routeContext || [], props: {}};
};

export const Route = ({component}, context) => {
    useComponent("RouteContext", RouteContext);
    return `<div class='{{props.config.className}}'>
        <${component} ...="{{props.config.props}}">
            <RouteContext routeContext="{{props.config.children}}" />
        </${component}>
    </div>`;
};
