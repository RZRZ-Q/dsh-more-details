import { type CredentialProvider } from '@deepseek-ai/dsh-credentials';
import { type WebChatLoginState, type WebChatLoginStore } from '../shared/webchat-login.js';
type LoginCredentials = Pick<CredentialProvider, 'readRecord' | 'modifyRecord' | 'deleteRecord'>;
/** 持久化由 DSH 凭据服务负责，只读写本插件自己的记录。 */
export declare class CredentialWebChatLoginStore implements WebChatLoginStore {
    private readonly credentials;
    constructor(credentials: LoginCredentials);
    read(): Promise<WebChatLoginState | null>;
    save(state: WebChatLoginState): Promise<void>;
    clear(): Promise<void>;
}
export {};
