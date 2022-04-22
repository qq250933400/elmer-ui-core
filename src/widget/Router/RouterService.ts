import { Common } from "elmer-common";
import { Service } from "../../decorators";

type TypeRouterServiceEvent = "onLocationChange";

export type TypeRouterType = "browser" | "hash" | "memory";
export type TypeRouterState = {
    listeners: any;
    location: string;
    type: TypeRouterType,
    tempData?: any
};

@Service
export class RouterService extends Common {
    state: TypeRouterState = {
        listeners: {},
        location: "",
        tempData: null,
        type: "browser"
    };
    constructor() {
        super();
        window.onpopstate = () => {
            this.onWindowHashChange({
                newURL: location.href,
                oldURL: this.state.location
            });
        };
    }
    onWindowHashChange(event) {
        const eventListeners = this.state.listeners["onLocationChange"];
        const newUrl = event.newURL || "", oldUrl = event.oldURL || "";
        let newLocationUrl = newUrl, oldLocationUrl = oldUrl;
        if(event.type === "hashchange") {
            const newHashUrl = /\#/.test(newUrl) ? (newUrl as string).replace(/[\s\S]*#/,"") : "";
            const oldHashUrl = (oldUrl as string).replace(/[\s\S]*#/,"");
            newLocationUrl = newHashUrl;
            oldLocationUrl = oldHashUrl;
        }
        this.state.location = newLocationUrl;
        Object.keys(eventListeners).map((evtId) => {
            eventListeners[evtId](newLocationUrl, oldLocationUrl);
        });
    }
    addEvent(name: TypeRouterServiceEvent, callback: Function): Function {
        const eventId = "router_event_" + this.guid();
        if(!this.state.listeners[name]) {
            this.state.listeners[name] = {};
        }
        this.state.listeners[name][eventId] = callback;
        return () => this.removeEvent(name, eventId);
    }
    push(pathName: string, state?: any, type?: "browser"|"hash"): void {
        let pushPathName = "";
        const oldPathName = this.state.location;
        if(type === "browser") {
            pushPathName = pathName;
        } else {
            pushPathName = "#" + pathName;
        }
        this.state.tempData = state;
        this.state.location = pushPathName;
        history.pushState(state, "NavigateTo", pushPathName);
        this.onWindowHashChange({
            newURL: pushPathName,
            oldURL: oldPathName
        });
    }
    /**
     * remove event callback from RouterContext
     * @param name eventName
     */
    private removeEvent(name: TypeRouterServiceEvent, eventId: string): void {
        if(this.state?.listeners[name]) {
            delete this.state.listeners[name][eventId];
        }
    }
}
