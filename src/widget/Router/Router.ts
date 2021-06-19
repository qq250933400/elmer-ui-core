import { Component } from "../../component/Component";
import decorators from "../../decorators";
import { PropTypes } from "../../propsValidation";
import { Route } from "./Route";
import { RouterContext, TypeRouterContext, TypeRouterType } from "./RouterContext";
import { RouterModel } from "./RouterModel";
import { RouterService } from "./RouterService";

const { loadComponents, Autowired } = decorators;

type TypeRouterProps = {
    type: TypeRouterType;
    RouterContext: TypeRouterContext;
    children: any[];
    __cfp__: boolean;
};
type TypeRouterData = {
    component: string;
    path: string;
    visible: boolean;
};
type TypeRouterState = {
    data: TypeRouterData[];
};

@loadComponents({
    Route,
    404: () => `<h2>404 Not Found</h2>`
})
class Router extends Component<TypeRouterProps, TypeRouterState> {
    static propType = {
        type: {
            defaultValue: "browser",
            description: "定义路由类型",
            rule: PropTypes.oneValueOf(["browser", "hash", "memory"]).isRequired
        },
        // tslint:disable-next-line: object-literal-sort-keys
        __cfp__: {
            defaultValue: true,
            description: "必须的属性用于从父组件继承",
            rule: PropTypes.bool.isRequired
        }
    };

    @Autowired(RouterModel)
    model: RouterModel;
    @Autowired(RouterService)
    service: RouterService;

    onRemoveLocationChange: Function;
    constructor(props:TypeRouterProps) {
        super(props);
        if(props?.RouterContext && props?.RouterContext?.type !== props.type) {
            props.RouterContext.type = props.type;
        }
        this.state = {
            data: []
        };
    }
    $getContext({path}) {
        return {
            data: {
                depth: path,
                type: this.props.type,
                // tslint:disable-next-line: object-literal-sort-keys
                push: (function(pathName: string, params?: any, type?: any):void {
                    if(type === "memory") {
                        this.model.md.nativegateTo(pathName, params);
                    } else {
                        this.service.com.push(pathName, params, type);
                    }
                }).bind(this)
            },
            name: "router_" + path.length + path[path.length - 1]
        };
    }
    $init(): void {
        // add event listen
        this.model.setType(this.props.type);
        this.model.setChildren(this.props.children);
        this.onRemoveLocationChange = this.service.addEvent("onLocationChange", this.model.onLocationChange.bind(this.model));
        this.state.data = this.model.getInitData();
    }
    $willMount(): void {
        // remove event
        this.onRemoveLocationChange();
    }
    getComponent(config) {
        const allComponents = this.$getComponents() || {};
        const component = this.getValue(allComponents,config.component);
        return component;
    }
    render(): any {
        return `
            <forEach data="state.data" item="config" index="routeIndex">
                <Route key="RouteLoop" path="{{config.path}}" component="{{getComponent(config)}}" config="{{config}}" if="{{config.visible}}" />
            </forEach>`;
    }
}
export default Router;
