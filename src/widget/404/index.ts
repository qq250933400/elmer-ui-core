import { EComponent } from "../../component/EComponent";
import { declareComponent } from "../../inject";
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
        this.redirect("", {
            page: "hahah",
            state: "region"
        });
    }
    $dispose():void {
        document.title = this.title;
    }
    public render(): string {
        return require("./views/index.html");
    }
}
