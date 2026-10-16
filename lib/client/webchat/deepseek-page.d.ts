/** 网页适配只操作官网可见 DOM；不读取凭据、页面私有状态或业务接口。 */
export interface DeepSeekPageMessage {
    id: string | null;
    role: 'user' | 'assistant';
    text: string;
}
export interface DeepSeekPageSnapshot {
    url: string;
    title: string;
    conversationId: string | null;
    login: 'required' | 'ready' | 'unknown';
    composerPresent: boolean;
    composerEmpty: boolean;
    messages: DeepSeekPageMessage[];
    messageRead: 'supported' | 'unsupported';
    generating: boolean | null;
    canCreate: boolean;
}
export interface DeepSeekSendRequest {
    requestId: string;
    text: string;
    expectedUrl: string;
}
export interface DeepSeekActionResult {
    status: 'dispatched' | 'blocked' | 'already-dispatched';
    reason: string | null;
    snapshot: DeepSeekPageSnapshot;
}
export interface DeepSeekReceipt {
    status: 'accepted' | 'pending' | 'unknown' | 'target-changed';
    message: DeepSeekPageMessage | null;
    snapshot: DeepSeekPageSnapshot;
}
/** 历史只保存官网会话路径，剔除可能含临时参数的 query/hash。 */
export declare function parseDeepSeekConversationUrl(raw: string): {
    url: string;
    conversationId: string;
} | null;
export declare function deepSeekProbeScript(): string;
export declare function deepSeekNewChatScript(expectedUrl: string): string;
export declare function deepSeekSendScript(request: DeepSeekSendRequest): string;
export declare function deepSeekReceiptScript(requestId: string): string;
