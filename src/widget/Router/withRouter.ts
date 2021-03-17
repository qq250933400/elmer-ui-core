import { useComponent, useState } from "../../hooks";
import { autoInit } from "../../injectable";
import { RouterService } from "./RouterService";

export const withRouter = () => {
    return (TargetComponent: Function) => {
        const serviceObj = autoInit(RouterService, {mode: "None"});
        return ({}, context) => {
            useComponent("RouterComponent", TargetComponent);
            useState("routeObj", {
                push: (pathName: string, state?: any) => {
                    if(context) {
                        let matchIndex = -1;
                        let matchObj = null;
                        // tslint:disable-next-line: forin
                        for(const cKey in context) {
                            const cMatch = cKey.match(/^router\_([0-9]{1,})$/);
                            if(cMatch) {
                                const index = parseInt(cMatch[1], 10);
                                if(index > matchIndex) {
                                    matchIndex = index;
                                    matchObj = context[cKey];
                                }
                            }
                        }
                        if(matchObj) {
                            matchObj.state.push(pathName, state, matchObj.state.type);
                            return true;
                        }
                    }
                    // call the common function to change location
                    serviceObj.push(pathName, state, "browser");
                }
            });
            return `<RouterComponent ...="{{props}}" location="{{state.routeObj}}"><context /></RouterComponent>`;
        };
    };
};
