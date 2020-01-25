import { Common } from "elmer-common";
import { Injectable } from "../inject/injectable";

@Injectable("MDomModel")
export class MDomModel extends Common {
    filterCheck(dom:HTMLElement, filter: string):  boolean {
        return false;
    }
}
