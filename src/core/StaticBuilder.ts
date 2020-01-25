import { BaseBuilder, EnumLogType } from "./BaseBuilder";

export class StaticBuilder extends BaseBuilder {
    srcPath:string;
    desPath:string;
    io: any;
    constructor(fs:any,srcPath:string, desPath:string) {
        super(fs);
        this.srcPath = srcPath;
        this.desPath = desPath;
        this.io = fs;
    }
    setSrcPath(path:string):void {
        this.srcPath = path;
    }
    setDesPath(path:string):void {
        this.desPath = path;
    }
    run():void {
        if(this.isExists(this.srcPath) && this.isExists(this.desPath)) {
            const srcRootPath = this.srcPath.replace(/\\/g,"/").replace(/\/$/,"");
            // tslint:disable-next-line:no-console
            console.log(this.formatLog("Source: " + srcRootPath, EnumLogType.INFO));
            // tslint:disable-next-line:no-console
            console.log(this.formatLog("Build: " + this.desPath, EnumLogType.INFO));
            this.scanFiles(this.srcPath, (fileName) => {
                if(!/(\.ts)$/.test(fileName)) {
                    const tmpSrcRootPath = srcRootPath.replace(/\//g,"\\");
                    const tmpFileName = fileName.replace(/\//g,"\\");
                    const desFileName = tmpFileName.replace(tmpSrcRootPath, "");
                    const desPath = this.desPath.replace(/\//g,"\\").replace(/\\$/,"");
                    const desFile = desPath + desFileName;
                    if(!/\.DS_Store$/.test(desFile)) {
                        this.saveFile(desFile, this.io.readFileSync(fileName));
                    }
                }
            });
        } else {
            // tslint:disable-next-line:no-console
            console.log(this.formatLog("请检查配置路径是否存在？", EnumLogType.WARNING));
        }
    }
}
