import { injectable } from "../../inject/injectable";
import { Common } from "elmer-common";
import { RouterContext } from "./RouterContext";
type TypeRouterServiceEvent = "onLocationChange";

@injectable("RouterService")
export class RouterService extends Common {
    addEvent(name: TypeRouterServiceEvent, callback: Function): string {
        const eventId = "router_event_" + this.guid();
        const contextObj = RouterContext[2];
        if(!contextObj.state.listeners[name]) {
            contextObj.state.listeners[name] = {};
        }
        contextObj.state.listeners[name][eventId] = callback;
        return eventId;
    }
    /**
     * remove event callback from RouterContext
     * @param name eventName
     */
    removeEvent(name: TypeRouterServiceEvent, eventId: string): void {
        const contextObj = RouterContext[2];
        if(contextObj.state?.listeners[name]) {
            delete contextObj.state.listeners[name][eventId];
        }
    }
}
