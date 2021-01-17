declare namespace ElmerUI {
    export interface IRouter {
        path: string | RegExp;
        props?: any;
        selector?: string;
    }
    export type TypeRedux = {
        createReducer: Function;
    }
    export interface IElmerGlobal {
        title: string;
        auther: string;
        version: string;
        elmerState: any;
        components: any;
        resizeListeners: any;
        bindTempVars: any;
        $console: any;
        classPool: Function[];
        objPool?: any[];
        routers: IRouter[];
        redux: TypeRedux;
        createUI: Function;
        getUI: Function;
        declareComponent:Function;
        autowired:Function;
        Injectable: Function;
        propTypes:any;
        Component:Function;
        setEnv: Function;
        ServiceHelper: Function;
        extends(a:any,b:any):void;
    }
}

declare var elmerData: ElmerUI.IElmerGlobal;

declare module "*.html" {
    const content: string;
    export default content;
}

declare var require: NodeRequire;
declare interface NodeRequire {
  <T>(path: string): any;
}