export const registerComponent = (widgets: object | Function, domName?: string) => {
    const register = (widgetFactory: Function, domNameValue?: string) => {
        // tslint:disable-next-line:no-shadowed-variable
        const domName = widgetFactory.toString();
        const fMatch = domName.match(/^function\s*([a-z0-9_\-]*)\s*\(/i);
        if (fMatch) {
            let dName = fMatch[1];
            dName = domNameValue && domNameValue.length>0 ? domNameValue :  dName;
            dName = dName.replace(/([A-Z])/g, "-$1").replace(/^([a-z])/i, "-$1").toLowerCase();
            dName = /^\-/.test(dName) ? dName : "-" + dName;
            dName = "eui" + dName;
            const saveData = elmerData.components || {};
            if (!saveData[dName]) {
                Object.defineProperty(widgetFactory, "selector", {
                    configurable: false,
                    enumerable: true,
                    value: dName,
                    writable: false
                });
                Object.defineProperty(elmerData.components, dName, {
                    configurable: false,
                    enumerable: true,
                    value: widgetFactory,
                    writable: false
                });
            }
        } else {
            throw new Error("未定义组件名称!");
        }
    };
    if (typeof widgets === "object") {
        Object.keys(widgets).map((wKey) => {
            const factory = (<any>widgets)[wKey];
            if (typeof factory === "function") {
                register(factory, wKey);
            } else {
                throw new Error(`The register component ${wKey} must be a function`);
            }
        });
    } else if (typeof widgets === "function") {
        register(widgets, domName);
    } else {
        throw new Error("The Register component is muse be a constructor or a object");
    }
};
