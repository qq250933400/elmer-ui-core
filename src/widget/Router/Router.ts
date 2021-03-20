import { Component } from "../../component/Component";
import { declareComponent, inject, loadComponents } from "../../component/declareComponent";
import { PropTypes } from "../../propsValidation";
import { Route } from "./Route";
import { RouterContext, TypeRouterContext, TypeRouterType } from "./RouterContext";
import { RouterModel } from "./RouterModel";
import { RouterService } from "./RouterService";

type TypeRouterProps = {
    type: TypeRouterType;
    RouterContext: TypeRouterContext;
    children: any[];
};
type TypeRouterData = {
    component: string;
    path: string;
    visible: boolean;
};
type TypeRouterState = {
    data: TypeRouterData[];
};
type TypeRouterModel = {
    md: RouterModel;
};
type TypeRouterService = {
    com: RouterService
};

const withContext = RouterContext[1];

@declareComponent({selector: "router"})
@withContext()
@inject({
    model: {
        md: RouterModel
    },
    service: {
        com: RouterService
    }
})
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
        }
    };
    model: TypeRouterModel;
    service: TypeRouterService;
    onRemoveLocationChange: Function;
    constructor(props:TypeRouterProps) {
        super(props);
        if(props?.RouterContext && props?.RouterContext?.type !== props.type) {
            props.RouterContext.type = props.type;
        }
        this.state = {
            data: []
        };
        console.log("init route");
    }
    $getContext({path}):any {
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
    $inject(): void {
        // add event listen
        this.model.md.setType(this.props.type);
        this.model.md.setChildren(this.props.children);
        this.onRemoveLocationChange = this.service.com.addEvent("onLocationChange", this.model.md.onLocationChange.bind(this.model.md));
        this.state.data = this.model.md.getInitData();
        console.log(this.props.children, "----$inject");
    }
    $willMount(): void {
        // remove event
        this.onRemoveLocationChange();
    }
    $didMount(): void {
        console.log(this.state.data, "---DidMount");
    }
    render(): any {
        return `
            <forEach data="state.data" item="config" index="routeIndex">
                <Route key="RouteLoop" component="{{config.component}}" config="{{config}}" if="{{config.visible}}" />
            </forEach>`;
    }
}
export default Router;
