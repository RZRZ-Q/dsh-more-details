import { type WebChatLoginState } from '../../shared/webchat-login.js';
export interface DeepSeekLoginReadResult {
    status: 'authenticated' | 'signed-out' | 'loading' | 'wrong-origin';
    state: WebChatLoginState | null;
}
export interface DeepSeekLoginRestoreResult {
    status: 'restored' | 'already-authenticated' | 'existing-token' | 'wrong-origin' | 'invalid-state';
}
export declare function deepSeekReadLoginScript(): string;
export declare function deepSeekRestoreLoginScript(state: WebChatLoginState): string;
