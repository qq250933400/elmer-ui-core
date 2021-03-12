import { Component } from "../../component/Component";
import { propTypes } from "../../propsValidation";
import "./styles/index.less";

export class Page404 extends Component {
    static propType:any = {
        title: {
            defaultValue: "页面不存在",
            description: "页面标题",
            rule: propTypes.string.isRequired
        }
    };
    private title: string;
    constructor(props: any) {
        super(props);
        this.title = props.title;
    }
    handleOnClick(): void {
        console.log("Need goto another page");
    }
    $dispose():void {
        document.title = this.title;
    }
    public render(): string {
        return require("./views/index.html");
    }
}
