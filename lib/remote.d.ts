import type { RemoteResult, RemoteStreamHandle, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import type { ChatRequest, CreateSideChatRequest, CreateSideChatValue, PrepareDetailsRequest, PrepareDetailsValue, SelectSideChatModelRequest, SelectSideChatModelValue, SendSideChatRequest, SideChatResult, SideChatStreamEvent } from './shared/contracts.js';
import type { ClearWebChatLoginResult, ReadWebChatLoginResult, SaveWebChatLoginRequest, SaveWebChatLoginResult, WebChatLoginRequest } from './shared/webchat-login.js';
import type { ReadWebChatReferenceRequest, ReadWebChatReferenceResult, SaveWebChatReferenceRequest, SaveWebChatReferenceResult } from './shared/webchat-reference.js';
export type CreateResult = SideChatResult<CreateSideChatValue>;
export type PrepareDetailsResult = SideChatResult<PrepareDetailsValue>;
export type SelectModelResult = SideChatResult<SelectSideChatModelValue>;
export type CancelResult = SideChatResult<{
    cancelled: true;
}>;
export type CloseResult = SideChatResult<{
    closed: true;
}>;
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface TypertRemoteNamespace$6d6f726544657461696c73 {
        saveWebChatReference: (request: SaveWebChatReferenceRequest) => Promise<RemoteResult<SaveWebChatReferenceResult>>;
        readWebChatReference: (request: ReadWebChatReferenceRequest) => Promise<RemoteResult<ReadWebChatReferenceResult>>;
        readWebChatLogin: (request: WebChatLoginRequest) => Promise<RemoteResult<ReadWebChatLoginResult>>;
        saveWebChatLogin: (request: SaveWebChatLoginRequest) => Promise<RemoteResult<SaveWebChatLoginResult>>;
        clearWebChatLogin: (request: WebChatLoginRequest) => Promise<RemoteResult<ClearWebChatLoginResult>>;
        prepareDetails: (request: PrepareDetailsRequest) => Promise<RemoteResult<PrepareDetailsResult>>;
        create: (request: CreateSideChatRequest) => Promise<RemoteResult<CreateResult>>;
        selectModel: (request: SelectSideChatModelRequest) => Promise<RemoteResult<SelectModelResult>>;
        stream: (request: SendSideChatRequest) => RemoteStreamHandle<SideChatStreamEvent, never>;
        cancel: (request: ChatRequest) => Promise<RemoteResult<CancelResult>>;
        close: (request: ChatRequest) => Promise<RemoteResult<CloseResult>>;
    }
    interface TypertRemoteMap {
        'moreDetails/saveWebChatReference': TypertRemoteNamespace$6d6f726544657461696c73['saveWebChatReference'];
        'moreDetails/readWebChatReference': TypertRemoteNamespace$6d6f726544657461696c73['readWebChatReference'];
        'moreDetails/readWebChatLogin': TypertRemoteNamespace$6d6f726544657461696c73['readWebChatLogin'];
        'moreDetails/saveWebChatLogin': TypertRemoteNamespace$6d6f726544657461696c73['saveWebChatLogin'];
        'moreDetails/clearWebChatLogin': TypertRemoteNamespace$6d6f726544657461696c73['clearWebChatLogin'];
        'moreDetails/prepareDetails': TypertRemoteNamespace$6d6f726544657461696c73['prepareDetails'];
        'moreDetails/create': TypertRemoteNamespace$6d6f726544657461696c73['create'];
        'moreDetails/selectModel': TypertRemoteNamespace$6d6f726544657461696c73['selectModel'];
        'moreDetails/stream': TypertRemoteNamespace$6d6f726544657461696c73['stream'];
        'moreDetails/cancel': TypertRemoteNamespace$6d6f726544657461696c73['cancel'];
        'moreDetails/close': TypertRemoteNamespace$6d6f726544657461696c73['close'];
    }
    interface TypertRemoteNamespaceMap {
        moreDetails: TypertRemoteNamespace$6d6f726544657461696c73;
    }
}
export declare const TYPERT_REMOTE: TypertRemoteContribution;
export default TYPERT_REMOTE;
export type { ChatRequest, CreateSideChatRequest, CreateSideChatValue, PrepareDetailsRequest, PrepareDetailsValue, SelectSideChatModelRequest, SelectSideChatModelValue, SendSideChatRequest, SideChatStreamEvent, SideChatRemote, SideChatResult, SideChatWireError, } from './shared/contracts.js';
export { SIDE_CHAT_ERROR_CODES, isSideChatErrorCode } from './shared/error-codes.js';
export type { ClearWebChatLoginResult, ReadWebChatLoginResult, SaveWebChatLoginRequest, SaveWebChatLoginResult, WebChatLoginRequest, WebChatLoginState, WebChatLoginStore } from './shared/webchat-login.js';
export type { ReadWebChatReferenceRequest, ReadWebChatReferenceResult, SaveWebChatReferenceRequest, SaveWebChatReferenceResult, WebChatCapture, WebChatReference } from './shared/webchat-reference.js';
