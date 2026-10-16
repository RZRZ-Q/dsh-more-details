import type { Context } from '@deepseek-ai/cordis';
import { type SessionEvent } from '@deepseek-ai/dsh-session';
import type { CreateSideChatRequest, PrepareDetailsRequest, PrepareDetailsValue, SideChatModelSelection, SideChatResult } from '../shared/contracts.js';
/** 与上游一致：限制 JavaScript 字符单元数，而不是 UTF-8 字节数。 */
export declare const MAX_CONTEXT_CHARS: number;
interface ParentContext {
    readonly context: string;
    readonly parentConversation: readonly {
        readonly role: string;
        readonly content: string;
    }[];
    readonly boundarySeq: number;
    readonly modelSelection: SideChatModelSelection | undefined;
    readonly sourceMessage?: string;
}
export declare function completedContextBoundary(events: readonly SessionEvent[], atSeq: number): number | undefined;
/** 只读来源已完成回合，不创建、归档或写入任何会话，也不解析模型。 */
export declare function readParentContext(ctx: Context, request: Pick<CreateSideChatRequest, 'parentSessionId' | 'atSeq' | 'selectedText'>, signal: AbortSignal, mode?: 'side-chat' | 'more-details'): Promise<SideChatResult<ParentContext>>;
/** 固定附加选文和参考背景，用户编辑默认指令时不需要保留任何占位符。 */
export declare function prepareDetailsPrompt(ctx: Context, request: PrepareDetailsRequest, defaultPrompt: string, signal: AbortSignal): Promise<SideChatResult<PrepareDetailsValue>>;
export {};
