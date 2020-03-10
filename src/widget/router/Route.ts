import { Component, declareComponent, IPropCheckRule, propTypes } from "../../index";

@declareComponent({
    selector: "route"
})
export class Route extends Component {
    static propType: any = {
        // tslint:disable-next-line:no-object-literal-type-assertion
        component: <IPropCheckRule>{
            defaultValue: "404",
            description: "Router绑定的组件",
            rule: propTypes.string.isRequired
        },
        path: <IPropCheckRule>{
            defaultValue: "/",
            description: "Router解析的Url",
            rule: propTypes.string.isRequired
        },
        props: <IPropCheckRule>{
            defaultValue: {},
            description: "初始传入的属性",
            rule: propTypes.object
        }
    };
    private component: string = "";
    private path: string = "";
    private propsData: any = {};
    constructor(props: any) {
        super(props);
    }
    $onPropsChanged(newProps: any): void {
        this.setData({
            component: newProps.component,
            path: newProps.path,
            propsData: newProps.props || {}
        });
    }
    public render(): string {
        let renderCode = "<" + this.component;
        if(this.component !== "eui-route") {
            delete this.propsData["if"];
            Object.keys(this.propsData).map((tmpPropertyKey: string) => {
                renderCode += " " + tmpPropertyKey + "=\"{{propsData." + tmpPropertyKey + "}}\"";
            });
            renderCode += "></" + this.component + ">";
        } else {
            renderCode = "<h5>渲染失败，请联系技术员</h5>";
        }
        return renderCode;
    }
}
