import { Component } from "../../component/Component";
import { loadComponents } from "../../component/declareComponent";
import { PropTypes } from "../../propsValidation";

const RouteContext = ({routeContext}) => {
    return {tagName: "VirtualRootNode", children: routeContext || [], props: {}};
};

@loadComponents({
    RouteContext,
}, ({ component }) => {
    return {
        RouteComponent: component
    };
})
export class Route extends Component {
    static propTypes = {
        component: {
            description: "加载显示的组件",
            rule: PropTypes.func.isRequired
        },
        path: {
            description: "路由匹配路径",
            rule: PropTypes.string.isRequired
        }
    };
    render() {
        return `<div class='{{props.config.className || ""}}'>
            <RouteComponent ...="{{props.config.props}}">
                <RouteContext routeContext="{{props.config.children}}" />
            </RouteComponent>
        </div>`;
    }
}
