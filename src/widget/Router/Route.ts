import { queueCallFunc, queueCallRaceAll, TypeQueueCallParam } from "elmer-common";
import { Component } from "../../component/Component";
import { Autowired, loadComponents } from "../../decorators";
import { ElmerService } from "../../lib/ElmerService";
import { PropTypes } from "../../propsValidation";

type TypeRouteProps = {
    path: string;
    component: any;
    async: boolean;
    actionUpdateRedux: Function;
};

const RouteContext = ({routeContext}) => {
    return {tagName: "VirtualRootNode", children: routeContext || [], props: {}};
};
// @connect({
//     mapDispatchToProps: (dispatch:Function) => ({
//         actionUpdateRedux: (data) => (dispatch(data))
//     })
// })
@loadComponents({
    RouteContext,
})
export class Route extends Component<TypeRouteProps> {
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
    state = {
        ajaxLoaded: false,
        hasAjaxRequest: false
    };
    private isDidMount: boolean = false;
    @Autowired(ElmerService)
    private serviceObj: ElmerService;

    $init(): void {
        const ajaxEndPoints = this.getAllMatchEndPoints();
        if(ajaxEndPoints.length > 0) {
            this.state.hasAjaxRequest = true;
            const sendAjax = (lastResult, param): Promise<any> => {
                return new Promise<any>((resolve, reject) => {
                    this.serviceObj.send({
                        endPoint: param.endPoint
                    }).then((resp:any) => {
                        this.props.actionUpdateRedux({
                            data: {
                                lastResult: lastResult.lastResult,
                                response: resp.data
                            },
                            type: param.actionType
                        });
                        resolve({});
                    }).catch((err) => {
                        this.props.actionUpdateRedux({
                            data: {
                                lastResult: lastResult.lastResult,
                                response: err.data,
                            },
                            type: param.actionType
                        });
                        reject(err);
                    });
                });
            };
            const ajaxDone = () => {
                if(this.isDidMount) {
                    this.setState({
                        ajaxLoaded: true
                    });
                } else {
                    this.state.ajaxLoaded = true;
                }
            };
            if(this.props.async || this.props.async === undefined) {
                queueCallFunc(ajaxEndPoints, (lastResult, param) => {
                   return sendAjax(lastResult, param);
                }).then(() => {
                    ajaxDone();
                }).catch((err) => {
                    ajaxDone();
                });
            } else {
                queueCallRaceAll(ajaxEndPoints, sendAjax)
                    .then(()=>ajaxDone())
                    .catch(() => ajaxDone());
            }
        }
    }
    $didMount(): void {
        this.isDidMount = true;
    }
    render() {
        return `<div class='{{props.config.className || ""}}'>
            <RouteComponent ...="{{props.config.props}}">
                <RouteContext routeContext="{{props.config.children}}" />
            </RouteComponent>
        </div>`;
    }
    private getAllMatchEndPoints() {
        const path = (this.props as any).path;
        const allConfig = this.serviceObj.getConfig();
        const params: TypeQueueCallParam[] = [];
        if(allConfig) {
            Object.keys(allConfig).map((namespace: string) => {
                const namespaceData = allConfig[namespace];
                namespaceData.endPoints && Object.keys(namespaceData.endPoints).map((id: string) => {
                    const endPoint = namespaceData.endPoints[id];
                    if(endPoint?.options?.withRoute && path === endPoint?.options?.withRoutePath) {
                        params.push({
                            id: namespace + "_" + id,
                            params: {
                                actionType: endPoint?.options?.withRouteAction,
                                endPoint: namespace + "." + id
                            }
                        });
                    }
                });
            });
        }
        return params;
    }
}
