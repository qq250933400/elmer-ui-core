import { Component } from "../../component/Component";
import { declareComponent } from "../../component/declareComponent";
import { PropTypes } from "../../propsValidation";
import { Model } from "./Model";

type TypeRouterProps = {
    type: string;
};

@declareComponent({
    model: {
        md: Model
    },
    selector: "router",
})
export class Router extends Component<TypeRouterProps> {
    static propType = {
        type: {
            rule: PropTypes.oneValueOf(["browser", "hash", "memory"]).isRequired
        }
    };
    constructor(props:any) {
        super(props);
        console.log(props);
    }
    $inject(): void {
        console.log("after $inject");
    }
    render(): any {
        return `<div>Router-Component</div>`;
    }
}
