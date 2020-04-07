import { ReduxController } from "elmer-redux";
import { IVirtualElement } from "elmer-virtual-dom";
import { Component } from "../../core/Component";
import { defineGlobalState, getGlobalState } from "../../init/globalUtil";
import { declareComponent } from "../../inject/injectable";
import { IRouter } from "../../interface/IDeclareComponentOptions";
import { TypeUIRenderOptions } from "../../interface/IElmerRender";
import { IPropCheckRule, PropTypes } from "../../propsValidation";
import "./Route";
import { ROUTER_SKIP_API_ACTION, RouterService } from "./RouterService";
import { autowired } from "../../inject/injectable";

type TypeRouterPropRule = {
    hashRouter: IPropCheckRule;
    url: IPropCheckRule;
    param: IPropCheckRule;
};
type TypeRouterProps = {[P in keyof TypeRouterPropRule]: any} & {
    children: IVirtualElement[];
};
type TypeRouterState = {
    url: string;
    isAjaxLoading: boolean;
    isNeedAjax: boolean;
    loadingPercent?: string;
};
type TypeRouterInjectService = {
    data?: any;
};
type TypeRouterContextType = {
    renderStore: IPropCheckRule;
};
type TypeRouterContext = {
    renderStore?: {
        options?: TypeUIRenderOptions;
    }
};
@declareComponent({
    selector: "router",
    // tslint:disable-next-line: object-literal-sort-keys
    model: {
        data: RouterService
    },
    // tslint:disable-next-line: object-literal-sort-keys
    connect: {
        mapDispatchToProps: (dispatch: Function) => {
            return {
                updateApiData: (actionType: string, data: any) => {
                    dispatch({
                        data,
                        type: actionType
                    });
                }
            };
        }
    }
})
export class Router extends Component {
    static propType:TypeRouterPropRule = {
        hashRouter: {
            defaultValue: true,
            description: "开启hash路由",
            rule: PropTypes.bool
        },
        param: {
            description: "定义传递的路由参数",
            rule: PropTypes.any
        },
        url: {
            description: "当前路由解析地址",
            rule: PropTypes.string
        }
    };
    static contextType:TypeRouterContextType = {
        renderStore: {
            description: "渲染入口传递参数,ElmerUI.render",
            rule: PropTypes.object.isRequired
        }
    };
    currentPage: any = {};
    firstCheck: boolean = false;
    props:TypeRouterProps;
    state: TypeRouterState = {
        isAjaxLoading: false,
        isNeedAjax: false,
        loadingPercent: "0%",
        url: ""
    };
    model: TypeRouterInjectService;
    context: TypeRouterContext;
    protected router: IRouter;
    private sourceRouters: IRouter[];

    @autowired(ReduxController)
    private redux:ReduxController;
    constructor(props:TypeRouterProps, context: {[P in keyof TypeRouterContextType]:any}) {
        super(props);
        const children = props.children || [];
        const routes:IRouter[] = [];
        children.map((tmpChild: IVirtualElement) => {
            if(tmpChild.tagName === "eui-route") {
                const tmpRoute:any = {
                    component: tmpChild.props["component"],
                    path: tmpChild.props["path"],
                    props: tmpChild.props.props || {}
                };
                routes.push(tmpRoute);
            }
        });
        this.sourceRouters = routes;
        this.firstCheck = true;
        this.context = context;
        if(!getGlobalState("euiRouter")) {
            defineGlobalState("euiRouter", {
                hashRouter: props.hashRouter,
                title: "euiRouter",
                toParams: null,
                version: "1.0.0"
            }, true);
        }
        this.state.url = props.url;
    }
    $onPropsChanged(props:TypeRouterProps): void {
        if(props.url !== this.state.url) {
            this.onRouterChanged(props.url || location.href || "", this.state.url, props.param);
        }
    }
    $inject(): void {
        // tslint:disable-next-line:no-console
        console.log("Router对象model注入成功，初始化Route参数");
        const linkUrl = undefined !== this.state.url && null !== this.state.url ? this.state.url : (location.href || "");
        this.model.data.initConfig(this.sourceRouters, this.props.hashRouter);
        this.model.data.setBindRouteComponent(this);
        this.model.data.refreshUrl(this.state.url);
        this.model.data.dispatch = (state:any): Promise<any> => {
            return this.redux.dispatch(state);
        };
        const updateRouter = this.model.data.checkRoutersVisible(linkUrl, null, null);
        if(!this.isEqual(updateRouter, this.router)) {
            this.router = updateRouter;
            // 当在服务端渲染的时候不执行请求动作，请求动作已经在elmer-ui-rsv代码中做了，
            // 按纯前端渲染设计页面初始化的时候自动请求配置的Router API,
            // 当开启服务端渲染的时候第一次渲染在服务端已经做了请求数据操作，所以在Router初始化时不用请求API
            if(undefined === this.context?.renderStore?.options || !this.context.renderStore?.options?.isRSV) {
                const ApiData = this.model.data.getRouterRequests(updateRouter);
                if(!getGlobalState("RenderInServer") && Object.keys(ApiData).length > 0) {
                    this.state.isAjaxLoading = true;
                    this.state.isNeedAjax = true;
                    this.state.loadingPercent = "0%";
                    this.model.data.ajaxAll(ApiData, {
                        onCompleted:() => {
                            this.setState({
                                isAjaxLoading: false
                            });
                        },
                        onDownloadProgress: (event) => {
                            this.setState({
                                loadingPercent: parseInt(((event.loaded/event.total)*100).toString(), 10) + "%"
                            });
                        }
                    }).then(() => {
                        this.setState({
                            isAjaxLoading: false
                        }, true);
                    }).catch(() => {
                        this.setState({
                            isAjaxLoading: false
                        }, true);
                    });
                } else {
                    this.state.isAjaxLoading = false;
                    this.state.isNeedAjax = false;
                }
            }
        }
    }
    onRouterChanged(newUrl:string, oldUrl: string, param:any): void {
        const updateRouter = this.model.data.checkRoutersVisible(newUrl, oldUrl, param);
        if(!this.isEqual(updateRouter, this.router)) {
            let ApiData = this.model.data.getRouterRequests(updateRouter);
            let skipResult = param ? param[ROUTER_SKIP_API_ACTION] : null;
            this.router = updateRouter;
            if(Object.keys(ApiData).length > 0 && (undefined === skipResult || null === skipResult || (null !== skipResult && undefined !== skipResult && !skipResult))) {
                this.setState({
                    isAjaxLoading: true,
                    isNeedAjax: true,
                    loadingPercent: "0%"
                });
                this.model.data.ajaxAll(ApiData, {
                    // tslint:disable-next-line: object-literal-sort-keys
                    onCompleted:():void => {
                        this.setState({
                            isAjaxLoading: false
                        }, true);
                    },
                    onDownloadProgress: (event) => {
                        this.setState({
                            loadingPercent: parseInt(((event.loaded/event.total)*100).toString(), 10) + "%"
                        }, true);
                    }
                }).then(() => {
                    this.setState({
                        isAjaxLoading: false
                    }, true);
                }).catch((option:any) => {
                    // option.obj?.setState({
                    //     isAjaxLoading: false
                    // });
                });
            } else {
                this.setState({
                    isAjaxLoading: false,
                    isNeedAjax: false
                }, true);
            }
            ApiData = null;
            skipResult = null;
        }
    }
    render(): string {
        let initRouterCode = "";
        if(this.router) {
            initRouterCode = `<${this.router.component} ex:props="{{router.props}}" />`;
        }
        return   initRouterCode+
        '<div em:if="state.isNeedAjax && state.isAjaxLoading" class="eui-router-progress"><div style="width:{{state.loadingPercent}};"></div></div>';
    }
}

export * from "./withRoter";
