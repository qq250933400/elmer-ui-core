import { injectable } from "../../injectable/injectable";
import { Common } from "elmer-common";
import { RouterContext } from "./RouterContext";

const [ routerState ] = RouterContext;

type TypeRouterServiceEvent = "onLocationChange";

@injectable("RouterService")
export class RouterService extends Common {
    constructor() {
        super();
        window.onpopstate = () => {
            this.onWindowHashChange({
                newURL: location.href,
                oldURL: routerState.location
            });
        };
    }
    onWindowHashChange(event) {
        const eventListeners = routerState.listeners["onLocationChange"];
        const newUrl = event.newURL || "", oldUrl = event.oldURL || "";
        let newLocationUrl = newUrl, oldLocationUrl = oldUrl;
        if(event.type === "hashchange") {
            const newHashUrl = /\#/.test(newUrl) ? (newUrl as string).replace(/[\s\S]*#/,"") : "";
            const oldHashUrl = (oldUrl as string).replace(/[\s\S]*#/,"");
            newLocationUrl = newHashUrl;
            oldLocationUrl = oldHashUrl;
        }
        routerState.location = newLocationUrl;
        Object.keys(eventListeners).map((evtId) => {
            eventListeners[evtId](newLocationUrl, oldLocationUrl);
        });
    }
    addEvent(name: TypeRouterServiceEvent, callback: Function): Function {
        const eventId = "router_event_" + this.guid();
        const contextObj = RouterContext[2];
        if(!contextObj.state.listeners[name]) {
            contextObj.state.listeners[name] = {};
        }
        contextObj.state.listeners[name][eventId] = callback;
        return () => this.removeEvent(name, eventId);
    }
    push(pathName: string, state?: any, type?: "browser"|"hash"): void {
        let pushPathName = "";
        const oldPathName = routerState.location;
        if(type === "browser") {
            pushPathName = pathName;
        } else {
            pushPathName = "#" + pathName;
        }
        routerState.tempData = state;
        routerState.location = pushPathName;
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
        const contextObj = RouterContext[2];
        if(contextObj.state?.listeners[name]) {
            delete contextObj.state.listeners[name][eventId];
        }
    }
}
