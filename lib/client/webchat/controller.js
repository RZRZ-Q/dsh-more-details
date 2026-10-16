import { parseDeepSeekConversationUrl } from './deepseek-page.js';
export const WEBCHAT_HISTORY_STORAGE_KEY = 'dsh-more-details.webchat-history.v1';
function errorMessage(error) { return error instanceof Error ? error.message : String(error); }
function requiresLogin(error) {
    if (error === null || typeof error !== 'object' || !('code' in error) || error.code !== 'login-required')
        return false;
    // 已经点击发送后的登录跳转也可能结果不明，不能据此再次发送。
    return !('submitted' in error) || error.submitted !== true;
}
function readHistory(storage) {
    try {
        const text = storage.getItem(WEBCHAT_HISTORY_STORAGE_KEY);
        if (text === null)
            return { history: [] };
        const value = JSON.parse(text);
        if (!Array.isArray(value))
            throw new Error('Invalid history');
        const history = [];
        for (const item of value) {
            if (item === null || typeof item !== 'object'
                || typeof item.url !== 'string' || typeof item.title !== 'string'
                || (item.sourceSessionId !== null && typeof item.sourceSessionId !== 'string')
                || typeof item.updatedAt !== 'number' || !Number.isFinite(item.updatedAt))
                throw new Error('Invalid history');
            const parsed = parseDeepSeekConversationUrl(item.url);
            if (parsed === null)
                throw new Error('Invalid history URL');
            if (!history.some(entry => entry.url === parsed.url))
                history.push({
                    url: parsed.url, title: item.title, sourceSessionId: item.sourceSessionId, updatedAt: item.updatedAt,
                });
        }
        return { history: history.sort((a, b) => b.updatedAt - a.updatedAt) };
    }
    catch {
        return { history: [], message: '无法读取本地网页聊天历史；已有网页聊天不受影响。' };
    }
}
/** 只管理网页导航、冻结的发送意图和历史元数据，不保存聊天正文或登录凭据。 */
export class WebChatController {
    port;
    prepare;
    source;
    storage;
    saveReference;
    state;
    listeners = new Set();
    binding;
    intent;
    sending;
    releaseParent;
    disposed = false;
    unsubscribeTarget;
    constructor(port, prepare, source, storage, saveReference) {
        this.port = port;
        this.prepare = prepare;
        this.source = source;
        this.storage = storage;
        this.saveReference = saveReference;
        this.state = { visible: false, hasOpened: false, busy: false, ...readHistory(storage) };
        this.refreshReferenceTarget();
        this.unsubscribeTarget = source.subscribeList(() => { this.refreshReferenceTarget(); });
    }
    getSnapshot = () => this.state;
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
    show() { this.update({ visible: true, hasOpened: true }); }
    hide() { this.update({ visible: false }); }
    dispose() {
        this.disposed = true;
        this.unsubscribeTarget();
        this.releaseSource();
        this.intent = undefined;
        this.binding = undefined;
        this.sending = undefined;
        this.state = { visible: false, hasOpened: false, busy: false, history: this.state.history };
        this.listeners.clear();
    }
    cancelPending() {
        if (this.disposed || this.state.busy)
            return;
        this.intent = undefined;
        this.update({ pending: undefined, message: undefined });
    }
    async addToDsh() {
        if (this.disposed || this.state.busy || this.state.pending !== undefined)
            return;
        const target = this.source.currentSessionId();
        const expectedUrl = this.state.currentUrl;
        if (target === undefined) {
            this.update({ message: '请先打开要接收引用的 DSH 主会话。' });
            return;
        }
        if (expectedUrl === undefined) {
            this.update({ message: '请先打开一条已有问答的网页聊天。' });
            return;
        }
        this.update({ busy: true, message: '正在保存网页讨论引用…' });
        try {
            const capture = await this.port.capture();
            if (this.disposed)
                return;
            if (capture.url !== expectedUrl || this.state.currentUrl !== expectedUrl) {
                throw new Error('网页聊天已切换，请重新点击“添加到 DSH”。');
            }
            const saved = await this.saveReference({ sessionId: target, capture });
            if (this.disposed)
                return;
            if (!saved.ok)
                throw new Error(saved.error.message);
            // 只向点击时显示的目标插入；用户中途切换会话时不写入任何草稿。
            if (this.source.currentSessionId() !== target)
                throw new Error('主会话已切换，尚未插入引用；请在目标会话重新点击“添加到 DSH”。');
            if (!this.source.addWebChatToConversation(target, saved.value.reference)) {
                throw new Error('未能插入引用，原草稿已保留；请检查主会话输入框后重试。');
            }
            this.update({ busy: false, visible: false, message: undefined });
            this.source.focusConversationInput(target);
            this.source.notify({ kind: 'status', text: '网页讨论已添加到草稿，可补充要求后发送。' });
        }
        catch (error) {
            this.update({ busy: false, message: errorMessage(error) });
        }
    }
    async newChat() {
        if (this.disposed || this.state.busy)
            return;
        this.intent = undefined;
        this.binding = undefined;
        this.update({ visible: true, hasOpened: true, busy: true, currentUrl: undefined,
            pending: undefined, message: '正在打开新聊天…' });
        try {
            await this.port.newChat();
            this.update({ busy: false, currentUrl: undefined, message: undefined });
        }
        catch (error) {
            this.update({ busy: false, pending: requiresLogin(error) ? { kind: 'new-chat', reason: 'login-required' } : undefined,
                message: requiresLogin(error) ? '请先在网页中登录，再点击“登录后继续”打开空白聊天。' : errorMessage(error) });
        }
    }
    async openHistory(url) {
        if (this.disposed || this.state.busy)
            return;
        const page = parseDeepSeekConversationUrl(url);
        if (page === null) {
            this.update({ message: '无法打开这条网页聊天链接。' });
            return;
        }
        this.binding = undefined;
        this.intent = undefined;
        this.update({ visible: true, hasOpened: true, busy: true, currentUrl: undefined,
            pending: undefined, message: '正在打开历史聊天…' });
        try {
            await this.port.open(page.url);
            if (this.disposed)
                return;
            const previous = this.state.history.find(item => item.url === page.url);
            const saved = previous === undefined
                ? { history: this.state.history } : this.remember(previous, previous.sourceSessionId, true);
            this.update({ ...saved, busy: false, message: saved.message });
        }
        catch (error) {
            this.update({ busy: false,
                pending: requiresLogin(error) ? { kind: 'open-chat', url: page.url, reason: 'login-required' } : undefined,
                message: requiresLogin(error) ? '请先在网页中登录，再点击“登录后继续”打开这条历史聊天。' : errorMessage(error) });
        }
    }
    async start(selection) {
        if (this.disposed || this.state.busy || this.state.pending !== undefined)
            return;
        this.update({ visible: true, hasOpened: true, busy: true, message: '正在准备更多详情…' });
        try {
            if (!this.source.selectionIsCurrent(selection))
                throw new Error('选文已变化，请重新选择一条已完成的消息。');
            this.releaseParent = this.source.retainParent(selection.parentSessionId);
            const prepared = await this.prepare({ parentSessionId: selection.parentSessionId,
                atSeq: selection.atSeq, selectedText: selection.text });
            if (this.disposed)
                return;
            if (!prepared.ok)
                throw new Error(prepared.error.message);
            if (!this.source.selectionIsCurrent(selection))
                throw new Error('选文已变化，请重新选择一条已完成的消息。');
            const targetUrl = this.binding?.sourceSessionId === selection.parentSessionId
                && this.binding.url === this.state.currentUrl ? this.binding.url : undefined;
            const intent = { prompt: prepared.value.prompt, sourceSessionId: selection.parentSessionId, targetUrl };
            this.intent = intent;
            await this.sendIntent(intent, targetUrl === undefined);
        }
        catch (error) {
            this.update({ busy: false, message: errorMessage(error) });
        }
        finally {
            this.releaseSource();
        }
    }
    async resume() {
        if (this.disposed || this.state.busy || this.state.pending?.reason !== 'login-required')
            return;
        if (this.state.pending.kind === 'new-chat') {
            await this.newChat();
            return;
        }
        if (this.state.pending.kind === 'open-chat') {
            await this.openHistory(this.state.pending.url);
            return;
        }
        if (this.intent === undefined)
            return;
        this.update({ visible: true, hasOpened: true, busy: true, message: '正在继续发送更多详情…' });
        // 登录可能改变所在网页；先恢复目标，绝不把被冻结的 prompt 发进偶然打开的聊天。
        await this.sendIntent(this.intent, true);
    }
    observePage(page) {
        if (this.disposed)
            return;
        const url = parseDeepSeekConversationUrl(page.url)?.url;
        const changed = url !== this.state.currentUrl;
        if (changed)
            this.binding = undefined;
        if (this.sending !== undefined && changed) {
            if (this.sending.expectedUrl === undefined && url !== undefined)
                this.sending.expectedUrl = url;
            else if (url !== this.sending.expectedUrl)
                this.sending.diverged = true;
        }
        this.update({ currentUrl: url });
        if (url !== undefined && !this.state.busy) {
            const sourceSessionId = this.binding?.sourceSessionId
                ?? this.state.history.find(item => item.url === url)?.sourceSessionId ?? null;
            const saved = this.remember({ url, title: page.title }, sourceSessionId, changed);
            this.update(saved);
        }
    }
    async sendIntent(intent, navigate) {
        let attempted = false;
        try {
            if (navigate) {
                this.binding = undefined;
                this.update({ currentUrl: undefined });
                if (intent.targetUrl === undefined)
                    await this.port.newChat();
                else
                    await this.port.open(intent.targetUrl);
            }
            if (this.disposed)
                return;
            const observation = { expectedUrl: intent.targetUrl, diverged: false };
            this.sending = observation;
            attempted = true;
            this.update({ message: '正在发送更多详情…' });
            const result = await this.port.send(intent.prompt, intent.targetUrl);
            if (this.disposed)
                return;
            const parsed = parseDeepSeekConversationUrl(result.url);
            if (parsed === null)
                throw new Error('网页未返回可确认的 DeepSeek 聊天地址。');
            const matched = !observation.diverged && (observation.expectedUrl === undefined || observation.expectedUrl === parsed.url);
            this.sending = undefined;
            this.intent = undefined;
            if (matched)
                this.binding = { sourceSessionId: intent.sourceSessionId, url: parsed.url };
            else
                this.binding = undefined;
            const saved = this.remember({ url: parsed.url, title: result.title }, intent.sourceSessionId, true);
            this.update({ ...saved, busy: false, pending: undefined,
                currentUrl: matched ? parsed.url : this.state.currentUrl,
                message: saved.message ?? (matched ? undefined : '已发送，但网页已切换；下次更多详情将新建聊天。') });
        }
        catch (error) {
            if (this.disposed)
                return;
            this.binding = undefined;
            this.sending = undefined;
            const login = requiresLogin(error);
            this.update({ busy: false, pending: { kind: 'prompt', prompt: intent.prompt,
                    sourceSessionId: intent.sourceSessionId, reason: login ? 'login-required' : 'unconfirmed' },
                message: login ? '请先在网页中登录，再点击“登录后继续”；待发送内容已保留。'
                    : `${attempted ? '发送结果未确认，请先查看网页，避免重复发送' : '尚未发送，请先检查网页'}：${errorMessage(error)}` });
        }
    }
    remember(page, sourceSessionId, refresh) {
        const previous = this.state.history.find(item => item.url === page.url);
        if (!refresh && previous?.title === page.title && previous.sourceSessionId === sourceSessionId)
            return { history: this.state.history };
        const history = [{ ...page, sourceSessionId, updatedAt: Date.now() }, ...this.state.history.filter(item => item.url !== page.url)];
        try {
            this.storage.setItem(WEBCHAT_HISTORY_STORAGE_KEY, JSON.stringify(history));
            return { history };
        }
        catch {
            return { history, message: '聊天仍可使用，但无法保存本地历史。' };
        }
    }
    releaseSource() {
        const release = this.releaseParent;
        this.releaseParent = undefined;
        release?.();
    }
    refreshReferenceTarget() {
        const sessionId = this.source.currentSessionId();
        const referenceTarget = sessionId === undefined ? undefined
            : { sessionId, title: this.source.title(sessionId) || '当前主会话' };
        if (referenceTarget?.sessionId === this.state.referenceTarget?.sessionId
            && referenceTarget?.title === this.state.referenceTarget?.title)
            return;
        this.update({ referenceTarget });
    }
    update(patch) {
        if (this.disposed)
            return;
        this.state = { ...this.state, ...patch };
        for (const listener of this.listeners)
            listener();
    }
}
