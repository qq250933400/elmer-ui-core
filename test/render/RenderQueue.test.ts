import "mocha";
import * as chai from "chai";
import { RenderQueue } from "../../src/render/RenderQueue";

const renderQueue = new RenderQueue();

describe("队列渲染测试", () => {
    it("单个任务渲染", (done) => {
        renderQueue.startAction("demo", {
            state: {
                a: 1
            }
        }, () => {
            return new Promise<any>((resolve) => {
                setTimeout(() => {
                    resolve({});
                    done();
                },1000);
            });
        });
    });
    it("多个任务不同时间段触发，执行结束有一个统一回调", (done) => {
        const renderAction = (data:any):Promise<any> => {
            return new Promise<any>((resolve) => {
                setTimeout(() => {
                    resolve({});
                },3000);
            });
        };
        renderQueue.startAction("mutilAction", {
            state: {
                b:2
            }
        }, renderAction, () => {
            done({statusCode: "500", message: "当前回调不应该被执行"});
        });
        renderQueue.startAction("mutilAction", {
            state: {
                b:3
            }
        }, renderAction, () => {
            done();
        });
    });
});
