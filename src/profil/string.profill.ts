if(!String.prototype["__defineGetter__"]) {
    // tslint:disable-next-line:typedef
    String.prototype["__defineGetter__"] = function(color,func) {
        this[color] = func;
    };
}
/*
if(!NodeList.prototype.forEach) {
    NodeList.prototype.forEach = function(callBack:Function, thisArgs?: any): void {
        const self = thisArgs || window;
        for(let i=0;i<this.length;i++) {
            callBack.call(self, this[i], this);
        }
    };
}
 */
if(!Date.prototype.format) {
    // tslint:disable-next-line: only-arrow-functions
    Date.prototype.format = function(formatStr: string): string {
        const year = this.getFullYear();
        let month = this.getMonth() + 1;
        let date = this.getDate();
        let hour = this.getHours();
        let minutes = this.getMinutes();
        let second = this.getSeconds();
        const milliseconds = this.getMilliseconds();
        month = month > 9 ? month : "0" + month;
        date = date > 9 ? date : "0" + date;
        hour = hour > 9 ? hour : "0" + hour;
        minutes = minutes > 9 ? minutes : "0" + minutes;
        second = second > 9 ? second : "0" + second;
        const result = formatStr.replace(/YYYY/g, year)
            .replace(/MM/g, month)
            .replace(/DD/g, date)
            .replace(/H/ig, hour)
            .replace(/i/g, minutes)
            .replace(/ms/g, milliseconds)
            .replace(/s/g, second)
            .replace(/yyyy/g, year)
            .replace(/mm/g, month)
            .replace(/dd/g, date);
        return result;
    };
}
