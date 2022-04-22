import { utils } from "elmer-common";
import { IVirtualElement } from "elmer-virtual-dom";
import { Autowired } from "../../decorators";
import { RouterService, TypeRouterType } from "./RouterService";

export class RouterModel {
    private children: IVirtualElement[];
    private domObj: any;
    private locationChangeEvtId: string;
    private routerType: TypeRouterType = "browser";
    private currentLocation: string;
    private currentIndex: number;
    private className: string;
    private history: string[] = [];
    private tempData: any;

    @Autowired(RouterService)
    private service: RouterService;

    constructor(obj:any) {
        this.domObj = obj;
        this.currentIndex = -1;
    }
    setType(type: TypeRouterType): void {
        this.routerType = type;
    }
    setChildren(children: IVirtualElement[]): void {
        this.children = children;
    }
    setEventId(id: string): void {
        this.locationChangeEvtId = id;
    }
    getEventId(): string {
        return this.locationChangeEvtId;
    }
    onLocationChange(newUrl, oldUrl): void {
        if(this.routerType === "memory") {
            this.currentLocation = newUrl;
        } else {
            this.service.state.location = newUrl;
        }
        const newRouteData = this.getInitData();
        this.domObj.setState({
            data: newRouteData
        });
    }
    nativegateTo(pathName: string, params?: any): void {
        if(this.routerType !== "memory") {
            this.service.push(pathName, params);
        } else {
            this.tempData = params;
            this.onLocationChange(pathName, this.currentLocation);
        }
    }
    getInitData(): any[] {
        const url = this.getLocation() || "";
        const RouterResult = [];
        let matchIndex = -1;
        if(this.children && this.children.length > 0 ) {
            let index = -1;
            for(const vdom of this.children) {
                index += 1;
                if(vdom.tagName === "eui-route") {
                    // 只对route 元素做判断，其他元素丢弃
                    const vprops = vdom.props;
                    const path: string = (vprops.path || "").replace(/^\s*/,"").replace(/\s*$/, "");
                    const component = vprops.component;
                    const isRegExp = vprops.isRegExp;
                    let isStopLoop = false;
                    if((typeof isRegExp === "boolean" && isRegExp)) {
                        if(/^\//.test(path) && /\/[igm]*$/.test(path)) {
                            const regSuffixArr = /\/([igm]*)$/.exec(path);
                            const regSuffix = regSuffixArr && regSuffixArr.length > 0 ? regSuffixArr[1] : "";
                            const reg = new RegExp(path.replace(/^\//, "").replace(/\/[igm]*$/, ""), regSuffix);
                            if(reg.test(path)) {
                                matchIndex = index;
                            }
                        } else {
                            throw new Error("The path value is not in the correct regular expression format.");
                        }
                    } else {
                        if(url.length > 1 && path.substr(0, url.length) === url) {
                            matchIndex = index;
                            isStopLoop = path === url;
                        }
                        if(path === "/" && (utils.isEmpty(url) || url === "/")) {
                            matchIndex = index;
                            isStopLoop = true;
                        }
                    }
                    const newRouterItem = {
                        children: vdom.children,
                        className: this.className || "",
                        component,
                        path,
                        props: {
                            ...vprops
                        }
                    };
                    RouterResult.push(newRouterItem);
                    delete newRouterItem.props.path;
                    delete newRouterItem.props.isRegExp;
                    delete newRouterItem.props.component;
                    if(isStopLoop) {
                        break;
                    }
                }
            }
        }
        if(matchIndex >= 0) {
            RouterResult[matchIndex].visible = true;
            RouterResult.push({
                component: "404",
                path: "/",
                visible: false
            });
        } else {
            RouterResult.push({
                component: "404",
                path: url,
                visible: true
            });
        }
        return RouterResult;
    }
    getLocation(): string {
        if(this.routerType === "browser") {
            const locationLink = (location.pathname || "").replace(/[\#\?][\s\S]*$/,"");
            const suffixReg = /[\s\S]*\.(html|htm|aspx|jsp|do|php)/i;
            return suffixReg.test(locationLink) ? locationLink.replace(suffixReg, "") : locationLink;
        } else if(this.routerType === "hash") {
            return (location.hash || "").replace(/^#/, "");
        } else {
            return this.currentLocation;
        }
    }
}
