import type { FileAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { SideChatResult } from './contracts.js';
export interface WebChatMessage {
    readonly id: string | null;
    readonly role: 'user' | 'assistant';
    readonly content: string;
}
export interface WebChatCapture {
    readonly version: 1;
    readonly url: string;
    readonly title: string;
    readonly capturedAt: string;
    readonly scope: 'rendered-current-branch';
    readonly completeness: 'partial';
    readonly messages: readonly WebChatMessage[];
}
export interface WebChatReference extends Omit<WebChatCapture, 'messages'> {
    readonly referenceId: string;
    readonly conversationId: string;
    readonly messageCount: number;
    readonly preview: readonly WebChatMessage[];
    readonly attachment: FileAttachmentRef;
}
export interface SaveWebChatReferenceRequest {
    readonly sessionId: string;
    readonly capture: WebChatCapture;
}
export type SaveWebChatReferenceResult = SideChatResult<{
    readonly reference: WebChatReference;
}>;
export interface ReadWebChatReferenceRequest {
    readonly sessionId: string;
    readonly referenceId: string;
}
export type ReadWebChatReferenceResult = SideChatResult<{
    readonly reference: WebChatReference;
    readonly capture: WebChatCapture;
}>;
export declare const WEBCHAT_REFERENCE_START = "<dsh_webchat_reference>";
export declare const WEBCHAT_REFERENCE_END = "</dsh_webchat_reference>";
export declare const MAX_WEBCHAT_SNAPSHOT_BYTES: number;
/** 官网会话地址的规范形式；不接受查询参数、跳转地址或文件路径。 */
export declare function webChatConversationId(value: string): string | undefined;
export declare function isWebChatCapture(value: unknown): value is WebChatCapture;
export declare function isWebChatReference(value: unknown): value is WebChatReference;
/** 最近三个已采集用户回合；不把部分渲染范围称为官网完整历史。 */
export declare function webChatPreview(messages: readonly WebChatMessage[]): readonly WebChatMessage[];
export declare function serializeWebChatReference(reference: WebChatReference): string;
export declare function parseWebChatReferencePrompt(text: string): {
    readonly reference: WebChatReference;
    readonly message: string;
} | undefined;
export declare function parseWebChatReferences(text: string): WebChatReference[];
