
export interface IElmerEvent {
    nativeEvent: MouseEvent|Event|KeyboardEvent|TouchEvent;
    data: any;
    dataSet:any;
    target:HTMLElement;
    cancelBubble?: boolean;
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
export interface IElmerInputEvent extends IElmerEvent {
    value: string;
}
export interface IElmerResizeEvent extends IElmerEvent {
    width: number;
    height: number;
    outWidth: number;
    outHeight: number;
}
