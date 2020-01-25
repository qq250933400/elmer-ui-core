export interface IElmerRenderParams {
    targetElement: HTMLElement;
    component: object;
    htmlCode: string;
}

export interface IElmerEvent {
    nativeEvent: MouseEvent|Event|KeyboardEvent|TouchEvent;
    data: any;
    dataSet:any;
    target:HTMLElement;
}
export interface IElmerKeyboardEvent extends IElmerEvent {
    nativeEvent: KeyboardEvent;
}
export interface IElmerTouchEvent extends IElmerEvent {
    nativeEvent: TouchEvent;
}
export interface IElmerBindEvent extends IElmerEvent  {
    value: any;
}
export interface IElmerMouseEvent extends IElmerEvent {
    nativeEvent: MouseEvent;
}

