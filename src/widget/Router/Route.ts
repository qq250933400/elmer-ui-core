import { useComponent } from "../../hooks";

const RouteContext = ({routeContext}) => {
    return {tagName: "VirtualRootNode", children: routeContext || [], props: {}};
};

export const Route = ({ component, config }) => {
    useComponent("RouteContext", RouteContext);
    if(component === "AsyncApp") {
        console.log("InRoute:", config);
    }
    return `<div class='{{props.config.className || ""}}'>
        <${component} ...="{{props.config.props}}">
            <RouteContext routeContext="{{props.config.children}}" />
        </${component}>
    </div>`;
};
