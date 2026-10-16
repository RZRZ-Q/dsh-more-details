import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import { TypertRemoteService, type RemoteStream } from '@deepseek-ai/dsh-typert-protocol'
import { ReadOnlySideChatService } from './host/read-only-chat-service.js'
import { prepareDetailsPrompt } from './host/parent-context.js'
import { CredentialWebChatLoginStore } from './host/webchat-login-store.js'
import { WebChatReferenceStore } from './host/webchat-reference-store.js'
import { registerWebChatReferenceTool } from './host/webchat-reference-tool.js'
import type { ReadWebChatReferenceRequest, ReadWebChatReferenceResult,
  SaveWebChatReferenceRequest, SaveWebChatReferenceResult } from './shared/webchat-reference.js'
import type { ClearWebChatLoginResult, ReadWebChatLoginResult, SaveWebChatLoginRequest,
  SaveWebChatLoginResult, WebChatLoginRequest } from './shared/webchat-login.js'
import { Config } from './config.js'
import type {
  ChatRequest, CreateSideChatRequest, CreateSideChatValue, PrepareDetailsRequest, PrepareDetailsValue, SelectSideChatModelRequest,
  SelectSideChatModelValue, SendSideChatRequest, SideChatResult, SideChatStreamEvent,
} from './shared/contracts.js'

export * from './host/index.js'
export * from './shared/constants.js'
export * from './shared/contracts.js'
export * from './shared/error-codes.js'
export * from './shared/webchat-reference.js'
export { Config } from './config.js'
declare module '@deepseek-ai/cordis' { interface Context { moreDetails: DshSideChatPlugin } }

/** Read-only model calls; no Agent, Session, or workspace lifecycle is created. */
export class DshSideChatPlugin extends TypertRemoteService {
  static inject = ['llm', 'sessions', 'sessionQuery', 'credentials', 'attachments', 'tools']
  static Config = Config
  readonly conversations: ReadOnlySideChatService
  private readonly webChatLogin: CredentialWebChatLoginStore
  private readonly webChatReferences: WebChatReferenceStore
  private readonly owners = new Set<string>()
  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'moreDetails')
    this.conversations = new ReadOnlySideChatService(ctx)
    this.webChatLogin = new CredentialWebChatLoginStore(ctx.credentials)
    this.webChatReferences = new WebChatReferenceStore(ctx)
    ctx.inject(['tools'], child => { registerWebChatReferenceTool(child, this.webChatReferences) })
    ctx.effect(() => async () => { await this.conversations.dispose() }, 'dsh-more-details.lifecycle')
    ctx.inject(['settings'], child => { child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)) })
  }
  prepareDetails(request: PrepareDetailsRequest, signal: AbortSignal): Promise<SideChatResult<PrepareDetailsValue>> {
    return prepareDetailsPrompt(this.ctx, request, this.config.defaultPrompt.get(), signal)
  }
  async saveWebChatReference(request: SaveWebChatReferenceRequest, signal: AbortSignal): Promise<SaveWebChatReferenceResult> {
    try { return { ok: true, value: { reference: await this.webChatReferences.save(request, signal) } } }
    catch (cause) { return { ok: false, error: { code: 'context_unavailable',
      message: `无法保存网页讨论引用：${cause instanceof Error ? cause.message : String(cause)}`, recoverable: true } } }
  }
  async readWebChatReference(request: ReadWebChatReferenceRequest, signal: AbortSignal): Promise<ReadWebChatReferenceResult> {
    try { return { ok: true, value: await this.webChatReferences.read(request, signal) } }
    catch (cause) { return { ok: false, error: { code: 'context_unavailable',
      message: `无法读取网页讨论引用：${cause instanceof Error ? cause.message : String(cause)}`, recoverable: true } } }
  }
  async readWebChatLogin(_request: WebChatLoginRequest): Promise<ReadWebChatLoginResult> {
    try { return { ok: true, value: { state: await this.webChatLogin.read() } } }
    catch { return { ok: false, error: { code: 'internal_error', message: '无法读取已保存的网页登录状态。', recoverable: true } } }
  }
  async saveWebChatLogin(request: SaveWebChatLoginRequest): Promise<SaveWebChatLoginResult> {
    try {
      await this.webChatLogin.save(request.state)
      return { ok: true, value: { saved: true } }
    } catch { return { ok: false, error: { code: 'internal_error', message: '无法保存网页登录状态。', recoverable: true } } }
  }
  async clearWebChatLogin(_request: WebChatLoginRequest): Promise<ClearWebChatLoginResult> {
    try {
      await this.webChatLogin.clear()
      return { ok: true, value: { cleared: true } }
    } catch { return { ok: false, error: { code: 'internal_error', message: '无法清除已保存的网页登录状态。', recoverable: true } } }
  }
  create(request: CreateSideChatRequest, signal: AbortSignal): Promise<SideChatResult<CreateSideChatValue>> {
    return this.conversations.create(request, this.owner(), signal)
  }
  selectModel(request: SelectSideChatModelRequest, signal: AbortSignal): Promise<SideChatResult<SelectSideChatModelValue>> {
    return this.conversations.selectModel(request, this.owner(), signal)
  }
  stream(request: SendSideChatRequest, signal: AbortSignal): RemoteStream<SideChatStreamEvent> {
    return this.conversations.stream(request, this.owner(), signal)
  }
  cancel(request: ChatRequest): Promise<SideChatResult<{ cancelled: true }>> {
    return this.conversations.cancel(request, this.owner())
  }
  close(request: ChatRequest): Promise<SideChatResult<{ closed: true }>> {
    return this.conversations.close(request, this.owner())
  }
  private owner(): string {
    const peer = this.ctx.invocation?.peer
    if (peer === undefined) return 'local'
    const id = String(peer.id)
    if (!this.owners.has(id)) {
      this.owners.add(id)
      peer.ctx.effect(() => () => {
        this.owners.delete(id)
        this.conversations.closeOwner(id)
      }, 'dsh-more-details.peer')
    }
    return id
  }
}
export default DshSideChatPlugin
