import { IComponent } from "./IComponent";

export type TypeUIRenderOptions = {
    isRSV?: boolean; // Render first init
};

export interface IElmerRenderParams {
    virtualTarget: HTMLElement;
    virtualId: string;
    component: IComponent;
    contentDom?: HTMLElement;
    previousSibling?: HTMLElement|SVGSVGElement|Element|Text|Comment;
    htmlCode: string;
    target?: HTMLElement;
    context?: any;
    uiRenderOptions?: TypeUIRenderOptions;
}

export type TypeRenderEventData = {
    callBack: Function;
    eventName: string;
    obj: HTMLElement;
    options: AddEventListenerOptions;
};
