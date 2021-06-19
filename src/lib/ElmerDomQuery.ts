import { Common } from "elmer-common";

export interface IElmerDomSelector {
    child?: IElmerDomSelector;
    value?: string;
    type?: string;
    mode?: string;
}

export class ElmerDomQuery extends Common {
    public getSelectors(selector: string): IElmerDomSelector[] {
        const regs:IElmerDomSelector[] = [];
        if(!this.isEmpty(selector)) {
            const rgs:string[] = selector.split(",");
            rgs.map((tmpRegStr: string) => {
                regs.push(this.getSelector(tmpRegStr));
            });
        }
        return regs;
    }
    private getSelector(querySelector: string): any {
        const result: any = {};
        const queryStr = querySelector.replace(/^\s*/, "").replace(/\s*$/,"");
        const prefReg = /^(\>|\+)([a-z0-9\-_\.#\[\]\s=\>\+\:]*)$/i;
        const prefMatch = queryStr.match(prefReg);
        let leftCode = "";
        let nodeQueryStr: string = queryStr;
        let nodeMode = "";
        if(prefMatch) {
            // 特殊mode
            nodeQueryStr = prefMatch[2];
            nodeMode = prefMatch[1];
        }
        const queryNodeResult = this.getSelectorNode(nodeQueryStr);
        if(queryNodeResult) {
            result.mode = nodeMode;
            result.type = queryNodeResult.type;
            result.value= queryNodeResult.value;
            leftCode = queryNodeResult.leftCode || "";
        }
        leftCode = leftCode.replace(/^\s*/,"").replace(/\s*$/,"");
        if(!this.isEmpty(leftCode) && leftCode.length>0) {
            result.child = this.getSelector(leftCode);
        }
        return result;
    }
    private getSelectorNode(queryStr:string): any {
        const prefReg = /^([\.#])([a-z0-9][a-z0-9\-_\.#\[\]\s=\>\+\:]*)$/i;
        const prefMatch = queryStr.match(prefReg);
        const result: any = {};
        const nodeReg = /^([a-z0-9][a-z0-9\-_\[\]=\.\:]*)([\s\>\+])/i;
        const nodeEndReg = /^([a-z0-9][a-z0-9\-_\[\]=\.\:]*)\s*$/i;
        let nodeValueStr = queryStr;
        let pref = "";
        if(prefMatch) {
            pref = prefMatch[1];
            nodeValueStr = prefMatch[2];
        }
        const nodeMatch = nodeValueStr.match(nodeReg);
        result.type = pref;
        if(nodeMatch) {
            result.value = nodeMatch[1];
            result.leftCode = nodeValueStr.replace(nodeReg, "$2");
        } else {
            const endNodeMatch = nodeValueStr.match(nodeEndReg);
            if(endNodeMatch) {
                result.value = endNodeMatch[0];
            }
        }
        return result;
    }
}
