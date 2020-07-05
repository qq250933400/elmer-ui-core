
import { defineReadonlyProperty } from "elmer-common";
import { IDeclareConnect } from "../../interface/IDeclareComponentOptions";

export function connect(options: IDeclareConnect): Function {
    // tslint:disable-next-line:typedef
    // tslint:disable-next-line:variable-name
    return (__contructor:Function): void => {
        defineReadonlyProperty(__contructor.prototype, "connect", options);
    };
}
