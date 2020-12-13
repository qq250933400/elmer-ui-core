import { IVirtualElement } from "elmer-virtual-dom";

export interface IRenderAttributeOptions {
    attrKey: string;
    attrValue: string;
    domData: IVirtualElement;
    component: any;
}
