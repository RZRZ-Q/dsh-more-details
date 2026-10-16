import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { ReadOnlySideChatService } from './host/read-only-chat-service.js';
import { prepareDetailsPrompt } from './host/parent-context.js';
import { CredentialWebChatLoginStore } from './host/webchat-login-store.js';
import { WebChatReferenceStore } from './host/webchat-reference-store.js';
import { registerWebChatReferenceTool } from './host/webchat-reference-tool.js';
import { Config } from './config.js';
export * from './host/index.js';
export * from './shared/constants.js';
export * from './shared/contracts.js';
export * from './shared/error-codes.js';
export * from './shared/webchat-reference.js';
export { Config } from './config.js';
/** Read-only model calls; no Agent, Session, or workspace lifecycle is created. */
export class DshSideChatPlugin extends TypertRemoteService {
    config;
    static inject = ['llm', 'sessions', 'sessionQuery', 'credentials', 'attachments', 'tools'];
    static Config = Config;
    conversations;
    webChatLogin;
    webChatReferences;
    owners = new Set();
    constructor(ctx, config) {
        super(ctx, 'moreDetails');
        this.config = config;
        this.conversations = new ReadOnlySideChatService(ctx);
        this.webChatLogin = new CredentialWebChatLoginStore(ctx.credentials);
        this.webChatReferences = new WebChatReferenceStore(ctx);
        ctx.inject(['tools'], child => { registerWebChatReferenceTool(child, this.webChatReferences); });
        ctx.effect(() => async () => { await this.conversations.dispose(); }, 'dsh-more-details.lifecycle');
        ctx.inject(['settings'], child => { child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)); });
    }
    prepareDetails(request, signal) {
        return prepareDetailsPrompt(this.ctx, request, this.config.defaultPrompt.get(), signal);
    }
    async saveWebChatReference(request, signal) {
        try {
            return { ok: true, value: { reference: await this.webChatReferences.save(request, signal) } };
        }
        catch (cause) {
            return { ok: false, error: { code: 'context_unavailable',
                    message: `无法保存网页讨论引用：${cause instanceof Error ? cause.message : String(cause)}`, recoverable: true } };
        }
    }
    async readWebChatReference(request, signal) {
        try {
            return { ok: true, value: await this.webChatReferences.read(request, signal) };
        }
        catch (cause) {
            return { ok: false, error: { code: 'context_unavailable',
                    message: `无法读取网页讨论引用：${cause instanceof Error ? cause.message : String(cause)}`, recoverable: true } };
        }
    }
    async readWebChatLogin(_request) {
        try {
            return { ok: true, value: { state: await this.webChatLogin.read() } };
        }
        catch {
            return { ok: false, error: { code: 'internal_error', message: '无法读取已保存的网页登录状态。', recoverable: true } };
        }
    }
    async saveWebChatLogin(request) {
        try {
            await this.webChatLogin.save(request.state);
            return { ok: true, value: { saved: true } };
        }
        catch {
            return { ok: false, error: { code: 'internal_error', message: '无法保存网页登录状态。', recoverable: true } };
        }
    }
    async clearWebChatLogin(_request) {
        try {
            await this.webChatLogin.clear();
            return { ok: true, value: { cleared: true } };
        }
        catch {
            return { ok: false, error: { code: 'internal_error', message: '无法清除已保存的网页登录状态。', recoverable: true } };
        }
    }
    create(request, signal) {
        return this.conversations.create(request, this.owner(), signal);
    }
    selectModel(request, signal) {
        return this.conversations.selectModel(request, this.owner(), signal);
    }
    stream(request, signal) {
        return this.conversations.stream(request, this.owner(), signal);
    }
    cancel(request) {
        return this.conversations.cancel(request, this.owner());
    }
    close(request) {
        return this.conversations.close(request, this.owner());
    }
    owner() {
        const peer = this.ctx.invocation?.peer;
        if (peer === undefined)
            return 'local';
        const id = String(peer.id);
        if (!this.owners.has(id)) {
            this.owners.add(id);
            peer.ctx.effect(() => () => {
                this.owners.delete(id);
                this.conversations.closeOwner(id);
            }, 'dsh-more-details.peer');
        }
        return id;
    }
}
export default DshSideChatPlugin;
