import type { Context } from '@deepseek-ai/cordis';
import { type SessionEvent } from '@deepseek-ai/dsh-session';
import { type WebChatCapture, type WebChatReference, type SaveWebChatReferenceRequest, type ReadWebChatReferenceRequest } from '../shared/webchat-reference.js';
/** 只认当前会话的用户消息；模型输出或工具结果里的引用不授予读取权限。 */
export declare function findSubmittedWebChatReference(events: readonly SessionEvent[], referenceId: string): WebChatReference | undefined;
/** 正文仅存 DSH 不可变附件；授权来源始终是会话事件，不另建索引数据库。 */
export declare class WebChatReferenceStore {
    private readonly ctx;
    constructor(ctx: Context);
    save(request: SaveWebChatReferenceRequest, signal: AbortSignal): Promise<WebChatReference>;
    read(request: ReadWebChatReferenceRequest, signal: AbortSignal): Promise<{
        reference: WebChatReference;
        capture: WebChatCapture;
    }>;
    private readAttachment;
}
/** 游标绑定不可变快照；翻页不会转向新的网页内容。 */
export declare function webChatReferencePage(reference: WebChatReference, capture: WebChatCapture, cursor?: string, limit?: number): {
    referenceId: string;
    title: string;
    url: string;
    capturedAt: string;
    scope: "rendered-current-branch";
    completeness: "partial";
    messageCount: number;
    offset: number;
    nextCursor: string | null;
    messages: {
        id: string | null;
        role: "user" | "assistant";
        content: string;
    }[];
};
