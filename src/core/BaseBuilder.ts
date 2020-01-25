import "colors";
import { Common } from "elmer-common";
import "../profil/string.profill";

export enum EnumLogType {
    INFO = "INFO",
    ERROR = "ERROR",
    WARNING = "WARNING",
    SUCCESS = "SUCCESS"
}

export class BaseBuilder extends Common {
    private fs:any;
    // tslint:disable-next-line:variable-name
    constructor(_fs:any) {
        super();
        this.fs = _fs;
    }
    isFile(fileName: string):boolean {
        let checkFileName = fileName;
        if(!/^[a-z]\:/i.test(fileName)) {
            checkFileName = fileName.replace(/\\/g, "/");
        }
        return this.isExists(checkFileName) ? this.fs.statSync(checkFileName).isFile() : false;
    }
    isExists(fileName:string):boolean {
        return this.fs.existsSync(fileName);
    }
    scanFiles(path:string, fn:Function):void {
        this.fs.readdir(path, (error, files) => {
            if(error) {
                const msg = this.formatLog(error.message, EnumLogType.ERROR);
                // tslint:disable-next-line:no-console
                console.error(msg);
                return;
            }
            let tmpPath = path.replace(/\//g,"\\");
            tmpPath = /\\$/.test(tmpPath) ? tmpPath : tmpPath + "\\";
            for(const tmpData of files) {
                let tmpFileName = tmpPath + tmpData;
                tmpFileName = /^[a-z]\:/i.test(tmpFileName) ? tmpFileName : tmpFileName.replace(/\\/g, "/");
                if(this.isFile(tmpFileName)) {
                    this.isFunction(fn) && fn(tmpFileName, tmpPath);
                } else {
                    this.scanFiles(tmpFileName, fn);
                }
            }
        });
    }
    saveFile(fileName:string, data: any):void {
        const tmpFile = fileName.replace(/\\/g,"/");
        const tIndex = tmpFile.lastIndexOf("/");
        if(!/^\//.test(tmpFile)) {
            // Windows系统
            if(tIndex>0) {
                const tmpPath = tmpFile.substr(0, tIndex);
                const tmpArr = tmpPath.split("/");
                let tmpStrPath = "";
                for(let i = 0;i<tmpArr.length; i++) {
                    tmpStrPath += this.isEmpty(tmpStrPath) ? tmpArr[i] : "/" + tmpArr[i];
                    if(!/^[A-Z]\:$/i.test(tmpStrPath)) {
                        if(!this.isExists(tmpStrPath)) {
                            this.fs.mkdirSync(tmpStrPath);
                            // tslint:disable-next-line:no-console
                            console.log(this.formatLog("创建目录：" + tmpStrPath, EnumLogType.INFO));
                        }
                    }
                }
                this.fs.writeFileSync(fileName, data);
            }
        } else {
            // linux系统
            if(tIndex>0) {
                const tmpPath = tmpFile.substr(0, tIndex);
                const tmpArr = tmpPath.split("/");
                let tmpStrPath = "";
                for(let i = 0;i<tmpArr.length; i++) {
                    tmpStrPath += "/" + tmpArr[i];
                    if(!this.isExists(tmpStrPath) && !this.isEmpty(tmpStrPath)) {
                        // tslint:disable-next-line:no-console
                        console.log(this.formatLog("创建目录：" + tmpStrPath, EnumLogType.INFO));
                        this.fs.mkdirSync(tmpStrPath);
                    }
                }
            }
            const saveFileName = fileName.replace(/\\/g,"/");
            this.fs.writeFileSync(saveFileName, data);
        }
        // tslint:disable-next-line:no-console
        console.log(this.formatLog("复制文件：" + fileName, EnumLogType.INFO));
    }
    formatLog(msg: string, type:EnumLogType): string {
        const now = (new Date()).format("YYYY-MM-DD HH:ii:ss");
        let result = "[" + type.toString() + "]["+now+"]    " + msg;
        switch(type) {
            case EnumLogType.INFO: {
                result = result.green;
                break;
            }
            case EnumLogType.ERROR: {
                result = result.red;
                break;
            }
            case EnumLogType.SUCCESS: {
                result = result.green;
                break;
            }
            case EnumLogType.WARNING: {
                result = result.yellow;
                break;
            }
            default: {
                result = result.magenta;
            }
        }
        return result;
    }
}
