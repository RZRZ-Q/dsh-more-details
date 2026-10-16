import { type DeepSeekPageSnapshot } from './deepseek-page.js';
import type { WebChatPort } from './controller.js';
import type { WebChatLoginStore } from '../../shared/webchat-login.js';
import type { WebChatCapture } from '../../shared/webchat-reference.js';
/** 官方临时 guest + 插件专用凭据：只保存官网登录白名单，不保存 Cookie 或整个浏览器资料。 */
export declare class DeepSeekGuest implements WebChatPort {
    private readonly loginStore;
    private element;
    private reservation;
    private bridge;
    private opening;
    private disposed;
    private poll;
    private unsubscribe;
    private probing;
    private container;
    private lastFailure;
    private preparedUrl;
    private onPage;
    private loginMessage;
    private readonly loginListeners;
    private lastSavedLogin;
    private canClearLogin;
    constructor(loginStore: WebChatLoginStore);
    readonly getLoginMessage: () => string;
    readonly subscribeLogin: (listener: () => void) => (() => void);
    private setLoginMessage;
    attach(container: HTMLElement): void;
    observe(listener: (page: DeepSeekPageSnapshot) => void): void;
    private assertLive;
    private ensure;
    private createGuest;
    private syncLogin;
    private observeNow;
    private probe;
    private waitFor;
    newChat(): Promise<void>;
    send(prompt: string, expectedUrl?: string): Promise<{
        url: string;
        title: string;
    }>;
    open(url: string): Promise<void>;
    capture(): Promise<WebChatCapture>;
    dispose(): Promise<void>;
    private releaseGuest;
}
