import { declareComponent } from "../../component/declareComponent";
import { EComponent } from "../../component/EComponent";
import { propTypes } from "../../propsValidation";
import "./styles/index.less";

@declareComponent({
    selector: "404"
})
export class Page404 extends EComponent {
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
