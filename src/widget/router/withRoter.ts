import { ROUTER_SKIP_API_ACTION, RouterService } from "./RouterService";

export const withRouter = (childComponent: any, Fn:any): any => {
    if(Object.prototype.toString.call(childComponent) === "[object Function]") {
        childComponent.prototype.redirect = (path: string, params: any) => {
            const now = new Date();
            const toParam = params || {};
            toParam.time = now.getTime();
            let obj:RouterService = Fn(RouterService);
            let toRouter = obj.checkRoutersVisible(path, null, toParam);
            let ApiData = obj.getRouterRequests(toRouter);
            let toPath = path;
            if(obj.hashRouter) {
                if(!(/^\#\/.*/.test(path))) {
                    toPath = "#/" + path.replace(/^\//, "");
                }
            }
            if(Object.keys(ApiData).length > 0) {
                toParam[ROUTER_SKIP_API_ACTION] = true;
                obj.setState({
                    isAjaxLoading: true,
                    isNeedAjax: true,
                    loadingPercent: "0%"
                });
                obj.ajaxAll(ApiData, {
                    option: {
                        obj
                    },
                    // tslint:disable-next-line: object-literal-sort-keys
                    onCompleted:(option:any):void => {
                        option.obj.setState({
                            isAjaxLoading: false
                        });
                        history.pushState(toParam, null, toPath);
                    },
                    onDownloadProgress: (event, option:any) => {
                        option.obj.setState({
                            loadingPercent: parseInt(((event.loaded/event.total)*100).toString(), 10) + "%"
                        });
                    }
                }).then((option:any) => {
                    option.obj?.setState({
                        isAjaxLoading: false
                    });
                }).catch((option:any) => {
                    option.obj?.setState({
                        isAjaxLoading: false
                    });
                });
            } else {
                history.pushState(toParam, null, toPath);
            }
            obj = null;
            ApiData = null;
            toRouter = null;
        };
        childComponent.prototype.hashRouter = (<RouterService>Fn(RouterService)).hashRouter;
        return childComponent;
    } else {
        throw new Error("withRouter只能用于Component");
    }
};
