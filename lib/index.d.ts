import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService, type RemoteStream } from '@deepseek-ai/dsh-typert-protocol';
import { ReadOnlySideChatService } from './host/read-only-chat-service.js';
import type { ReadWebChatReferenceRequest, ReadWebChatReferenceResult, SaveWebChatReferenceRequest, SaveWebChatReferenceResult } from './shared/webchat-reference.js';
import type { ClearWebChatLoginResult, ReadWebChatLoginResult, SaveWebChatLoginRequest, SaveWebChatLoginResult, WebChatLoginRequest } from './shared/webchat-login.js';
import { Config } from './config.js';
import type { ChatRequest, CreateSideChatRequest, CreateSideChatValue, PrepareDetailsRequest, PrepareDetailsValue, SelectSideChatModelRequest, SelectSideChatModelValue, SendSideChatRequest, SideChatResult, SideChatStreamEvent } from './shared/contracts.js';
export * from './host/index.js';
export * from './shared/constants.js';
export * from './shared/contracts.js';
export * from './shared/error-codes.js';
export * from './shared/webchat-reference.js';
export { Config } from './config.js';
declare module '@deepseek-ai/cordis' {
    interface Context {
        moreDetails: DshSideChatPlugin;
    }
}
/** Read-only model calls; no Agent, Session, or workspace lifecycle is created. */
export declare class DshSideChatPlugin extends TypertRemoteService {
    private readonly config;
    static inject: string[];
    static Config: import("@deepseek-ai/schemastery").default<Schemastery.ObjectS<NoInfer<{
        defaultPrompt: import("@deepseek-ai/schemastery").default<string, string, "volatile-defined">;
        webChatLayout: import("@deepseek-ai/schemastery").default<NoInfer<Schemastery.ObjectS<NoInfer<{
            width: import("@deepseek-ai/schemastery").default<number, number, "defined">;
            height: import("@deepseek-ai/schemastery").default<number, number, "defined">;
            expanded: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
            width: import("@deepseek-ai/schemastery").default<number, number, "defined">;
            height: import("@deepseek-ai/schemastery").default<number, number, "defined">;
            expanded: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        }>>>, "volatile-defined">;
    }>>, Schemastery.ObjectT<NoInfer<{
        defaultPrompt: import("@deepseek-ai/schemastery").default<string, string, "volatile-defined">;
        webChatLayout: import("@deepseek-ai/schemastery").default<NoInfer<Schemastery.ObjectS<NoInfer<{
            width: import("@deepseek-ai/schemastery").default<number, number, "defined">;
            height: import("@deepseek-ai/schemastery").default<number, number, "defined">;
            expanded: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
            width: import("@deepseek-ai/schemastery").default<number, number, "defined">;
            height: import("@deepseek-ai/schemastery").default<number, number, "defined">;
            expanded: import("@deepseek-ai/schemastery").default<boolean, boolean, "defined">;
        }>>>, "volatile-defined">;
    }>>, "plain">;
    readonly conversations: ReadOnlySideChatService;
    private readonly webChatLogin;
    private readonly webChatReferences;
    private readonly owners;
    constructor(ctx: Context, config: Config);
    prepareDetails(request: PrepareDetailsRequest, signal: AbortSignal): Promise<SideChatResult<PrepareDetailsValue>>;
    saveWebChatReference(request: SaveWebChatReferenceRequest, signal: AbortSignal): Promise<SaveWebChatReferenceResult>;
    readWebChatReference(request: ReadWebChatReferenceRequest, signal: AbortSignal): Promise<ReadWebChatReferenceResult>;
    readWebChatLogin(_request: WebChatLoginRequest): Promise<ReadWebChatLoginResult>;
    saveWebChatLogin(request: SaveWebChatLoginRequest): Promise<SaveWebChatLoginResult>;
    clearWebChatLogin(_request: WebChatLoginRequest): Promise<ClearWebChatLoginResult>;
    create(request: CreateSideChatRequest, signal: AbortSignal): Promise<SideChatResult<CreateSideChatValue>>;
    selectModel(request: SelectSideChatModelRequest, signal: AbortSignal): Promise<SideChatResult<SelectSideChatModelValue>>;
    stream(request: SendSideChatRequest, signal: AbortSignal): RemoteStream<SideChatStreamEvent>;
    cancel(request: ChatRequest): Promise<SideChatResult<{
        cancelled: true;
    }>>;
    close(request: ChatRequest): Promise<SideChatResult<{
        closed: true;
    }>>;
    private owner;
}
export default DshSideChatPlugin;
