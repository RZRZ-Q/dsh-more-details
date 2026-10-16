import type { SessionId as DshSessionId } from '@deepseek-ai/dsh-session/types';
import type { ConversationSelection, SideChatResult } from '../../shared/contracts.js';
import type { DshClientContext } from './context.js';
import type { DshSideChatSessions } from './sessions-adapter.js';
export type PrepareDetails = (request: {
    parentSessionId: ConversationSelection['parentSessionId'];
    atSeq: number;
    selectedText: string;
}) => Promise<SideChatResult<{
    prompt: string;
}>>;
export interface MoreDetailsState {
    readonly busy: boolean;
    readonly message?: string;
    readonly sessionId?: DshSessionId;
    readonly retryable?: boolean;
}
/** 操作属于插件生命周期，发送始终绑定创建返回的 ID，不随当前页面切换。 */
export declare class MoreDetailsController {
    private readonly ctx;
    private readonly prepare;
    private readonly source;
    private state;
    private readonly listeners;
    private pending;
    private disposed;
    constructor(ctx: DshClientContext, prepare: PrepareDetails, source: Pick<DshSideChatSessions, 'selectionIsCurrent' | 'retainParent'>);
    readonly getSnapshot: () => MoreDetailsState;
    readonly subscribe: (listener: () => void) => (() => void);
    dispose(): void;
    dismiss(): void;
    openCreated(): void;
    start(selection: ConversationSelection): Promise<void>;
    retry(): Promise<void>;
    private sendPending;
    private update;
}
