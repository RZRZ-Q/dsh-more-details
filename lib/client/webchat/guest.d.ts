import { type DeepSeekPageSnapshot } from './deepseek-page.js';
import type { WebChatPort } from './controller.js';
import { type WebChatMessage } from './messages.js';
import type { WebChatLoginStore } from '../../shared/webchat-login.js';
import type { WebChatCapture } from '../../shared/webchat-reference.js';
interface Reservation {
    lease: string;
    partition: string;
}
interface BrowserBridge {
    acquire(workspace: string): Promise<Reservation>;
    release(lease: string): Promise<void>;
    onOpenRequested(lease: string, listener: (url: string) => void): () => void;
}
/** 在注册入口和真正创建 guest 时检查宿主能力；Web 渲染器也会在普通浏览器中加载。 */
export declare function webChatBrowserBridge(): BrowserBridge | undefined;
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
    private accessibleLabel;
    private readonly loginListeners;
    private lastSavedLogin;
    private canClearLogin;
    constructor(loginStore: WebChatLoginStore);
    readonly getLoginMessage: () => WebChatMessage;
    readonly subscribeLogin: (listener: () => void) => (() => void);
    private setLoginMessage;
    setAccessibleLabel(label: string): void;
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
export {};
