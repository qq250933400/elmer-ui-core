import { Common } from "elmer-common";
import { IVirtualElement } from "elmer-virtual-dom";
import { autoInit, autowired } from "../inject";
import { EnumHTMLElementInsertMethod, IComponent, TypeThemeDefault } from "../interface/IComponent";
import { withRouter } from "../widget/router/withRoter";
import { ElmerServiceRequest } from "./ElmerServiceRequest";

// tslint:disable:no-empty

/**
 * 所有的组件必须继承次类
 */
export abstract class Component extends Common implements IComponent {
    static propType:any = {};
    static contextType:any = {};
    /**
     * Define the context data
     */
    domList: any = {};
    dom: any = {};
    domData: IVirtualElement;
    props: any = {};
    context: any = {};
    state: any = {};
    id: string = "";
    model?: any;
    service?: any;
    private templateCode: string;
    constructor(props?: any, context?: any) {
        super();
        // 此处不能使用父类定义方法，防止在原生写法出现未完成继承父类导致出现错误
        const getRandomID =():string => {
            const now  = new Date();
            const year = now.getFullYear().toString(),
                month = now.getMonth()+1<10 ? "0" + (now.getMonth()+1).toString() : (now.getMonth()+1).toString(),
                date = now.getDate()<10 ? "0" + now.getDate().toString() : now.getDate().toString(),
                hour = now.getHours() < 10 ? ["0",now.getHours()].join("") : now.getHours().toString(),
                minute = now.getMinutes() < 10 ? ["0", now.getMinutes()].join("") : now.getMinutes().toString(),
                second = now.getSeconds() < 10 ? ["0", now.getSeconds()].join("") : now.getSeconds().toString(),
                reSecond = now.getMilliseconds();
            const randValue = parseInt((Math.random()*9999+1000).toString(), 10);
            return [year,month, date, hour,minute, second,reSecond,randValue].join("");
        };
        Object.defineProperty(this,"props", {
            configurable: true,
            enumerable: false,
            value:props
        });
        if(context) {
            this.defineReadOnlyProperty(this, "context", context);
        }
        // this.defineReadOnlyProperty(this, "props", props);
        if(props === undefined || props === null) {
            throw new Error("Please set the props to super method");
        } else if(typeof props !== "object") {
            throw new Error("Please set the props by component parameter");
        }
        this.id = getRandomID();
    }
    // tslint:disable-next-line:no-empty
    addEvent(handle: any, dom: HTMLElement|Element|Node,eventName: string, callBack:Function, options?:AddEventListenerOptions):void {
        throw new Error("The current function is defined when the component is initialized.");
    }
    /**
     * 将新元素插入目标元素附近
     * @param refElement 位置目标参考元素
     * @param newElement 要插入的元素
     * @param InsertMethod 插入位置方式，EnumHTMLElementInsertMethod取值, beforeBegin目标元素开始标签之前,beforeEnd目标元素的子元素最后一个
     */
    insertAdjacentElement(refElement:HTMLElement|Element|Node, newElement:HTMLElement|Element|Node, InsertMethod: string):void {
        switch(InsertMethod) {
            case EnumHTMLElementInsertMethod.beforeBegin: {
                refElement.parentNode !== null && refElement.parentNode.insertBefore(newElement,refElement);
                break;
            }
            case EnumHTMLElementInsertMethod.beforeEnd: {
                refElement.appendChild(newElement);
                break;
            }
            case EnumHTMLElementInsertMethod.afterBegin: {
                refElement.insertBefore(newElement, refElement.firstChild);
                break;
            }
            case EnumHTMLElementInsertMethod.afterEnd: {
                if(refElement.nextSibling) {
                    refElement.parentNode !== null && refElement.parentNode.insertBefore(newElement, refElement.nextSibling);
                } else {
                    refElement.parentNode !== null && refElement.parentNode.appendChild(newElement);
                }
                break;
            }
            default:{
                refElement.parentNode !== null && refElement.parentNode.appendChild(newElement);
            }
        }
    }
    /**
     * 修改组件属性值，触发重绘事件
     * @param data object 修改属性集合
     * @param refresh boolean 是否强制触发重绘事件
     */
    public setData(data: object, refresh?: boolean): void {
        throw new Error("Component类未通过ElmerRender类做初始化！");
    }
    public setState(data: object, refresh?: boolean): void {
        throw new Error("setState方法未通过ElmerRender类做初始化！");
    }
    public render(): string {throw new Error("【render】方法未通过ElmerRender类做初始化！");}

    public $afterVirtualRender?(dom?:IVirtualElement): void;
    public $afterDiff?(dom?:IVirtualElement): void;
    public $beforeVirtualRender?(dom?:IVirtualElement): void;
    public $beforeDiff?(dom?:IVirtualElement): void;
    public $onPropsChanged(propData: any,oldProps: any): void {}
    public $init?(): void {}
    public $inject?(): void {}
    public $before?(): void {}
    public $after?(): void {}
    public $resize?(): void {}
    public $dispose?(): void {}
    public redirect(path:string, params?: any):void {}
    public getChildrenContext():any {return null;}
    /**
     * 修改全局样式
     * @param theme 全局样式名称
     * @param themeConfig 保存theme的信息的对象，为自动清除旧样式用
     */
    setTheme<T>(theme: keyof T | keyof TypeThemeDefault, themeConfig?: T): void {
        const innerTheme:TypeThemeDefault = {
            default: "elmerThemeDefault",
            themePink: "elmerThemePink"
        };
        const classListData = document.body.classList;
        let themeValue = "";
        if(themeConfig) {
            Object.keys(themeConfig).map((tmpThemeKey) => {
                classListData.remove(themeConfig[tmpThemeKey]);
                if(tmpThemeKey === theme) {
                    themeValue = themeConfig[tmpThemeKey];
                }
            });
        }
        Object.keys(innerTheme).map((tmpThemeKey) => {
            classListData.remove(innerTheme[tmpThemeKey]);
            if(tmpThemeKey === theme) {
                themeValue = innerTheme[tmpThemeKey];
            }
        });
        if(!this.isEmpty(themeValue)) {
            classListData.add(themeValue);
        }
    }
    loadTemplate(url:string, isEndPoint?: boolean, ajaxType?: "GET" |　"POST"):Promise<any> {
        if(this.isEmpty(this.templateCode)) {
            const request = {
                // tslint:disable-next-line:no-object-literal-type-assertion
                obj:(<ElmerServiceRequest> {})
            };
            const type = /(GET|POST)/i.test(ajaxType) ? ajaxType : "GET";
            autowired(ElmerServiceRequest)(request, "obj");
            return new Promise((resolve:Function) => {
                request.obj.sendRequest({
                    endPoint: isEndPoint ? url : null,
                    type,
                    url: !isEndPoint ? url : null,
                    // tslint:disable-next-line:object-literal-sort-keys
                    header: {
                        "Content-Type": "text/plain;charset=utf8;"
                    }
                }).then((resp) => {
                    this.templateCode = resp;
                    resolve(resp);
                }).catch((err:any) => {
                    const msg = err.statusText || "加载模版文件失败";
                    resolve("<label>" + msg + "</label>");
                });
            });
        } else {
            return new Promise((resolve) => {
                resolve(this.templateCode);
            });
        }
    }
}

withRouter<Component>(Component, autoInit);
// tslint:enable:no-empty
