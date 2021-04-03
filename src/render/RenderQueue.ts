import { Common } from "elmer-common";
export type TypeRenderQueueOptions = {
    state?: any;
    data?: any;
    firstRender?: boolean;
};
type TypeRenderQueueAction = {
    actionId: string;
    isRended?: boolean;
    options: TypeRenderQueueOptions;
    resolve:Function;
    reject: Function;
};

type RenderCallback = (data: TypeRenderQueueOptions) => Promise<any>;

type TypeRenderQueueSession = {
    actionList: TypeRenderQueueAction[];
    actionRuning: boolean;
    actionRuningIndexs: number[];
    lastActionIndex: number;
    onFinish: Function;
    render: RenderCallback;
};

/**
 * 队列执行渲染任务
 * 1、当前模块主要功能将一次渲染当做一个任务推送到队列中去执行
 * 2、在第一次渲染还未执行结束时触发第二次或更多次渲染任务，在第一次渲染结束以后，立即执行第二次渲染，此时会将新增的任务数据合并一次执行
 */
export class RenderQueue extends Common {
    static className: string = "RenderQueue";
    private queueList: any = {};
    startAction(sessionId: string, options: TypeRenderQueueOptions, renderCallback: RenderCallback,finishCallback?: Function): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const actionId = "queueRenderAction_" + this.guid();
            if(!this.queueList[sessionId]) {
                this.queueList[sessionId] = {
                    actionList: [],
                    actionRuning: false,
                    actionRuningIndexs: [],
                    lastActionIndex: -1,
                    render: renderCallback
                };
            }
            this.queueList[sessionId].onFinish = finishCallback;
            this.queueList[sessionId].actionList.push(<TypeRenderQueueAction>{
                actionId,
                isRended: false,
                options,
                reject,
                resolve
            });
            this.runActions(sessionId);
        });
    }
    private runActions(sessionId: string): void {
        try {
            const renderSession: TypeRenderQueueSession = this.queueList[sessionId];
            if(!renderSession.actionRuning) {
                // 没有正在执行任务，开始检测状态并进入执行阶段
                // 当有任务正在执行时跳过触发阶段
                const actionLength = renderSession.actionList.length;
                if(actionLength > 0) {
                    // has task waiting
                    const updateState = {};
                    const updateData = {};
                    for(let i=actionLength - 1;i>renderSession.lastActionIndex;i--) {
                        if(!renderSession.actionList[i].isRended) {
                            // 合并队列中的数据，统一执行一次
                            // 添加当前队列索引到执行状态的列表中，下一次执行任务忽略执行过的队列
                            const curAction = renderSession.actionList[i];
                            this.extend(updateState, curAction.options.state);
                            this.extend(updateData, curAction.options.data);
                            renderSession.actionRuningIndexs.push(i);
                            renderSession.actionList[i].isRended = true;
                        }
                    }
                    renderSession.lastActionIndex = actionLength - 1;
                    renderSession.actionRuning = true;
                    renderSession.render({
                        data: updateData,
                        state: updateState
                    }).then(() => {
                        // 将当前执行的数据都
                        this.checkSessionStatus(sessionId, false);
                    }).catch((err) => {
                        this.checkSessionStatus(sessionId, true, err);
                    });
                }
            }
        } catch(e) {
            // tslint:disable-next-line: no-console
            console.error(e, "---QueueAction");
        }
    }
    private checkSessionStatus(sessionId: string, error: any, exception?: any): void {
        const renderSession: TypeRenderQueueSession = this.queueList[sessionId];
        if(renderSession && renderSession.actionList) {
            // 当任务队列长度等于已经执行过的索引长度一致时可认为任务已经执行完成
            const finished = renderSession.actionList.length === renderSession.actionRuningIndexs.length;
            if(finished) {
                // 任务结束以后执行回调
                renderSession.actionRuning = false;
                for(const action of renderSession.actionList) {
                    if(error) {
                        action.reject(exception);
                    } else {
                        action.resolve({});
                    }
                }
                // 通知最后一次触发任务时的回调，某些场景不需要每次渲染任务结束都需要执行操作
                typeof renderSession.onFinish === "function" && renderSession.onFinish();
            } else {
                // 任务未执行完成，继续下一次任务
                renderSession.actionRuning = false;
                this.runActions(sessionId);
            }
        }
    }
}
