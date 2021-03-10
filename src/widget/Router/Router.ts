import { Component } from "../../component/Component";
import { declareComponent, inject, loadComponents } from "../../component/declareComponent";
import { PropTypes } from "../../propsValidation";
import { RouterModel } from "./RouterModel";
import { RouterService } from "./RouterService";
import { RouterContext, TypeRouterContext, TypeRouterType } from "./RouterContext";
import { Route } from "./Route";

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
    Route
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
    constructor(props:TypeRouterProps) {
        super(props);
        if(props.RouterContext.type !== props.type) {
            props.RouterContext.type = props.type;
        }
        this.state = {
            data: []
        };
    }
    $getContext():any {
        return {
            name: "routerContext",
            data: {
                example: "Test"
            }
        }
    }
    $inject(): void {
        // add event listen
        this.model.md.setType(this.props.type);
        this.model.md.setChildren(this.props.children);
        this.model.md.setEventId(this.service.com.addEvent("onLocationChange", this.model.md.onLocationChange));
        this.state.data = this.model.md.getInitData();
    }
    $willMount(): void {
        // remove event
        this.service.com.removeEvent("onLocationChange", this.model.md.getEventId());
    }
    $willReceiveProps(newProps:any): void {
        console.log("willReceiveProps - Router", newProps);
    }
    render(): any {
        return `
            <forEach data="state.data" item="config" index="routeIndex">
                <Route key="RouteLoop" component="{{config.component}}" config="{{config}}" if="{{config.visible}}" />
            </forEach>`;
    }
}

export default Router;
