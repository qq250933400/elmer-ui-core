import { RouterContext, TypeRouterType } from "./RouterContext";
import { IVirtualElement } from "elmer-virtual-dom";
import { autowired } from "../../inject";
import { RouterService } from "./RouterService";
import { StaticCommon as utils } from "elmer-common";

export class RouterModel {
    private children: IVirtualElement[];
    private domObj: any;
    private locationChangeEvtId: string;
    private routerType: TypeRouterType = "browser";
    private currentLocation: string;
    private className: string;

    @autowired(RouterService)
    private service: RouterService;

    constructor(obj:any) {
        this.domObj = obj;
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
        console.log(newUrl, oldUrl);
    }
    getInitData(): any[] {
        const url = this.getLocation();
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
                        if(path === "/" && utils.isEmpty(url)) {
                            matchIndex = index;
                            isStopLoop = true;
                        }
                    }
                    const newRouterItem = {
                        path,
                        component,
                        props: {
                            ...vprops
                        },
                        children: vdom.children,
                        className: this.className || ""
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
                path: "/",
                component: "404",
                visible: false
            });
        } else {
            RouterResult.push({
                path: url,
                component: "404",
                visible: true
            });
        }
        return RouterResult;
    }
    getLocation(): string {
        if(this.routerType === "browser") {
            return location.pathname;
        } else if(this.routerType === "hash") {
            return (location.hash || "").replace(/^#/, "");
        } else {
            return this.currentLocation;
        }
    }
}
