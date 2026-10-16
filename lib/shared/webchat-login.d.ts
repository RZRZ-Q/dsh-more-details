import type { SideChatResult } from './contracts.js';
/** 官网登录白名单及可选语言偏好的原始字符串，不拆包或重新编码令牌。 */
export interface WebChatLoginState {
    readonly userToken: string;
    readonly userInfo: string | null;
    readonly deviceId: string | null;
    readonly localePreference?: string;
}
export interface WebChatLoginStore {
    read(): Promise<WebChatLoginState | null>;
    save(state: WebChatLoginState): Promise<void>;
    clear(): Promise<void>;
}
export type WebChatLoginRequest = Record<string, never>;
export interface SaveWebChatLoginRequest {
    readonly state: WebChatLoginState;
}
export type ReadWebChatLoginResult = SideChatResult<{
    readonly state: WebChatLoginState | null;
}>;
export type SaveWebChatLoginResult = SideChatResult<{
    readonly saved: true;
}>;
export type ClearWebChatLoginResult = SideChatResult<{
    readonly cleared: true;
}>;
/** 官网 StorageHandle 的语言格式；此函数也会序列化到隔离的官网页面。 */
export declare function isWebChatLocalePreference(value: unknown): value is string;
export declare function isWebChatLoginState(value: unknown): value is WebChatLoginState;
export declare function parseWebChatLoginState(value: unknown): WebChatLoginState;
