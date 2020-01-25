import { IVirtualElement } from "elmer-virtual-dom";
import { ElmerRender } from "../core/ElmerRender";

export interface IRenderAttributeOptions {
    attrKey: string;
    attrValue: string;
    domData: IVirtualElement;
    render: ElmerRender;
    component: any;
}
