const IDLE = { busy: false };
/** 操作属于插件生命周期，发送始终绑定创建返回的 ID，不随当前页面切换。 */
export class MoreDetailsController {
    ctx;
    prepare;
    source;
    state = IDLE;
    listeners = new Set();
    pending;
    disposed = false;
    constructor(ctx, prepare, source) {
        this.ctx = ctx;
        this.prepare = prepare;
        this.source = source;
    }
    getSnapshot = () => this.state;
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
    dispose() {
        this.disposed = true;
        this.pending = undefined;
        this.state = IDLE;
        this.listeners.clear();
    }
    dismiss() {
        if (this.state.busy)
            return;
        this.pending = undefined;
        this.update(IDLE);
    }
    openCreated() {
        if (!this.disposed && this.state.sessionId !== undefined)
            this.ctx.uiWorkspace.openSession(this.state.sessionId);
    }
    async start(selection) {
        if (this.disposed || this.state.busy || this.pending !== undefined)
            return;
        this.update({ busy: true, message: '正在创建更多详情会话…' });
        let release;
        try {
            if (!this.source.selectionIsCurrent(selection))
                throw new Error('选文已变化，请重新选择一条已完成的消息。');
            const parentId = selection.parentSessionId;
            const workspace = this.ctx.workspaces.list.getSnapshot().items.find(item => item.sessionIds.includes(parentId));
            const cwd = this.ctx.sessions.list.getSnapshot().byId[parentId]?.cwd;
            if (workspace === undefined && cwd === undefined)
                throw new Error('无法确定来源会话的项目或目录。');
            const location = workspace === undefined ? { cwd: cwd } : { workspaceId: workspace.workspaceId };
            release = this.source.retainParent(selection.parentSessionId);
            const prepared = await this.prepare({ parentSessionId: selection.parentSessionId, atSeq: selection.atSeq, selectedText: selection.text });
            if (!prepared.ok)
                throw new Error(prepared.error.message);
            if (this.disposed)
                return;
            const pending = { prompt: prepared.value.prompt };
            this.pending = pending;
            try {
                pending.sessionId = await this.ctx.sessions.create(location);
            }
            catch (error) {
                if (this.disposed)
                    return;
                // rc.2 可能已经创建会话，仅绑定项目失败；保留其真实 ID。
                const failure = error?.rpcError;
                if (failure?.code === 'session/workspace-attach-failed') {
                    pending.sessionId = failure.details.sessionId;
                    this.ctx.uiWorkspace.openSession(pending.sessionId);
                    this.update({ busy: false, sessionId: pending.sessionId, retryable: true,
                        message: `会话已创建，但未能归入来源项目：${failure.message}。可以在同一会话重试发送。` });
                    return;
                }
                this.pending = undefined;
                throw error;
            }
            if (this.disposed)
                return;
            await this.sendPending(pending);
        }
        catch (error) {
            if (this.disposed)
                return;
            this.update({ busy: false, message: error instanceof Error ? error.message : String(error) });
        }
        finally {
            release?.();
        }
    }
    async retry() {
        if (this.disposed || this.state.busy || !this.state.retryable || this.pending?.sessionId === undefined)
            return;
        this.update({ busy: true, sessionId: this.pending.sessionId, message: '正在向已创建的会话重新发送…' });
        await this.sendPending(this.pending);
    }
    async sendPending(pending) {
        const id = pending.sessionId;
        let attempted = false;
        try {
            await this.ctx.sessions.using(id, { source: 'controllerOperation' }, async (reference) => {
                if (this.disposed)
                    return;
                const session = reference.binding.session;
                const snapshot = session.getSnapshot();
                if (snapshot.openState !== 'open')
                    throw new Error(snapshot.openError?.message ?? '新会话未能打开。');
                const submission = session.beginSubmission({ mode: 'queue', text: pending.prompt, attachments: [] });
                attempted = true;
                const result = await session.prompt([{ type: 'text', text: pending.prompt }], 'queue', undefined, submission.requestId);
                if (this.disposed)
                    return;
                if (!result.ok) {
                    const uncertain = result.error.code === 'gateway/internal' || result.error.code === 'gateway/cancelled';
                    this.update({ busy: false, sessionId: id, retryable: !uncertain,
                        message: `${uncertain ? '发送结果未确认，请先查看会话，避免重复发送' : '发送未成功，可在同一会话重试'}：${result.error.message}` });
                }
                else {
                    this.pending = undefined;
                    this.update(IDLE);
                }
                // 原生主视图接管引用，插件释放临时引用不会销毁页面或正式历史。
                if (!this.disposed)
                    this.ctx.uiWorkspace.openSession(id);
            });
        }
        catch (error) {
            if (this.disposed)
                return;
            this.update({ busy: false, sessionId: id, retryable: !attempted,
                message: `${attempted ? '发送结果未确认，请先查看会话' : '会话已创建，但尚未发送'}：${error instanceof Error ? error.message : String(error)}` });
            if (!this.disposed)
                this.ctx.uiWorkspace.openSession(id);
        }
    }
    update(state) {
        if (this.disposed)
            return;
        this.state = state;
        for (const listener of this.listeners)
            listener();
    }
}
