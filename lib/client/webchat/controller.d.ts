import type { ConversationSelection, SessionId, SideChatResult } from '../../shared/contracts.js';
import type { SaveWebChatReferenceRequest, WebChatCapture, WebChatReference } from '../../shared/webchat-reference.js';
import type { PrepareDetails } from '../dsh/more-details-controller.js';
import type { DshSideChatSessions } from '../dsh/sessions-adapter.js';
import type { Localize } from '../dsh/locale.js';
import { type WebChatMessage } from './messages.js';
export declare const WEBCHAT_HISTORY_STORAGE_KEY = "dsh-more-details.webchat-history.v1";
export interface WebChatPage {
    readonly url: string;
    readonly title: string;
}
export interface WebChatPort {
    /** 完成时必须已经进入空白新聊天页，不能停留在上一条聊天。 */
    newChat(): Promise<void>;
    /** 返回值确认本次提交所在的真实网页会话；未提交且缺登录时可抛 login-required。 */
    send(prompt: string, expectedUrl?: string): Promise<WebChatPage>;
    open(url: string): Promise<void>;
    /** 仅采集当前已加载的已完成问答，不导航或发送。 */
    capture(): Promise<WebChatCapture>;
}
export type SaveWebChatReference = (request: SaveWebChatReferenceRequest) => Promise<SideChatResult<{
    reference: WebChatReference;
}>>;
interface ReferenceTarget {
    readonly sessionId: SessionId;
    readonly title: string;
}
export interface WebChatHistoryItem extends WebChatPage {
    readonly sourceSessionId: string | null;
    readonly updatedAt: number;
}
export type WebChatPending = {
    readonly kind: 'prompt';
    readonly prompt: string;
    readonly sourceSessionId: string;
    readonly reason: 'login-required' | 'unconfirmed';
} | {
    readonly kind: 'new-chat';
    readonly reason: 'login-required';
} | {
    readonly kind: 'open-chat';
    readonly url: string;
    readonly reason: 'login-required';
};
export interface WebChatState {
    readonly visible: boolean;
    readonly hasOpened: boolean;
    readonly busy: boolean;
    readonly history: readonly WebChatHistoryItem[];
    readonly currentUrl?: string | undefined;
    readonly message?: WebChatMessage | undefined;
    readonly pending?: WebChatPending | undefined;
    readonly referenceTarget?: ReferenceTarget | undefined;
}
type HistoryStorage = Pick<Storage, 'getItem' | 'setItem'>;
/** 只管理网页导航、冻结的发送意图和历史元数据，不保存聊天正文或登录凭据。 */
export declare class WebChatController {
    private readonly port;
    private readonly prepare;
    private readonly source;
    private readonly storage;
    private readonly saveReference;
    private readonly text;
    private state;
    private readonly listeners;
    private binding;
    private intent;
    private sending;
    private releaseParent;
    private disposed;
    private readonly unsubscribeTarget;
    constructor(port: WebChatPort, prepare: PrepareDetails, source: Pick<DshSideChatSessions, 'selectionIsCurrent' | 'retainParent' | 'currentSessionId' | 'title' | 'subscribeList' | 'addWebChatToConversation' | 'focusConversationInput' | 'notify'>, storage: HistoryStorage, saveReference: SaveWebChatReference, text?: Localize);
    readonly getSnapshot: () => WebChatState;
    readonly subscribe: (listener: () => void) => (() => void);
    show(): void;
    hide(): void;
    dispose(): void;
    cancelPending(): void;
    addToDsh(): Promise<void>;
    newChat(): Promise<void>;
    openHistory(url: string): Promise<void>;
    start(selection: ConversationSelection): Promise<void>;
    resume(): Promise<void>;
    observePage(page: WebChatPage): void;
    private sendIntent;
    private remember;
    private releaseSource;
    private refreshReferenceTarget;
    private update;
}
export {};
