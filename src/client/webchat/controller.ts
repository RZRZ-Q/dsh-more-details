import type { ConversationSelection, SessionId, SideChatResult } from '../../shared/contracts.js'
import type { SaveWebChatReferenceRequest, WebChatCapture, WebChatReference } from '../../shared/webchat-reference.js'
import type { PrepareDetails } from '../dsh/more-details-controller.js'
import type { DshSideChatSessions } from '../dsh/sessions-adapter.js'
import { parseDeepSeekConversationUrl } from './deepseek-page.js'
import type { Localize } from '../dsh/locale.js'
import { renderWebChatMessage, webChatErrorMessage, webChatHostMessage, WebChatMessageError, type WebChatMessage } from './messages.js'

export const WEBCHAT_HISTORY_STORAGE_KEY = 'dsh-more-details.webchat-history.v1'
export interface WebChatPage { readonly url: string; readonly title: string }
export interface WebChatPort {
  /** 完成时必须已经进入空白新聊天页，不能停留在上一条聊天。 */
  newChat(): Promise<void>
  /** 返回值确认本次提交所在的真实网页会话；未提交且缺登录时可抛 login-required。 */
  send(prompt: string, expectedUrl?: string): Promise<WebChatPage>
  open(url: string): Promise<void>
  /** 仅采集当前已加载的已完成问答，不导航或发送。 */
  capture(): Promise<WebChatCapture>
}
export type SaveWebChatReference = (request: SaveWebChatReferenceRequest) => Promise<SideChatResult<{ reference: WebChatReference }>>
interface ReferenceTarget { readonly sessionId: SessionId; readonly title: string }
export interface WebChatHistoryItem extends WebChatPage {
  readonly sourceSessionId: string | null
  readonly updatedAt: number
}
export type WebChatPending =
  | { readonly kind: 'prompt'; readonly prompt: string; readonly sourceSessionId: string;
    readonly reason: 'login-required' | 'unconfirmed' }
  | { readonly kind: 'new-chat'; readonly reason: 'login-required' }
  | { readonly kind: 'open-chat'; readonly url: string; readonly reason: 'login-required' }
export interface WebChatState {
  readonly visible: boolean
  readonly hasOpened: boolean
  readonly busy: boolean
  readonly history: readonly WebChatHistoryItem[]
  readonly currentUrl?: string | undefined
  readonly message?: WebChatMessage | undefined
  readonly pending?: WebChatPending | undefined
  readonly referenceTarget?: ReferenceTarget | undefined
}
type HistoryStorage = Pick<Storage, 'getItem' | 'setItem'>
interface PromptIntent {
  readonly prompt: string
  readonly sourceSessionId: string
  readonly targetUrl?: string | undefined
}
interface SendObservation { expectedUrl?: string | undefined; diverged: boolean }

function requiresLogin(error: unknown): boolean {
  if (error === null || typeof error !== 'object' || !('code' in error) || error.code !== 'login-required') return false
  // 已经点击发送后的登录跳转也可能结果不明，不能据此再次发送。
  return !('submitted' in error) || error.submitted !== true
}
function readHistory(storage: HistoryStorage): { history: WebChatHistoryItem[]; message?: WebChatMessage } {
  try {
    const text = storage.getItem(WEBCHAT_HISTORY_STORAGE_KEY)
    if (text === null) return { history: [] }
    const value: unknown = JSON.parse(text)
    if (!Array.isArray(value)) throw new Error('Invalid history')
    const history: WebChatHistoryItem[] = []
    for (const item of value) {
      if (item === null || typeof item !== 'object'
        || typeof item.url !== 'string' || typeof item.title !== 'string'
        || (item.sourceSessionId !== null && typeof item.sourceSessionId !== 'string')
        || typeof item.updatedAt !== 'number' || !Number.isFinite(item.updatedAt)) throw new Error('Invalid history')
      const parsed = parseDeepSeekConversationUrl(item.url)
      if (parsed === null) throw new Error('Invalid history URL')
      if (!history.some(entry => entry.url === parsed.url)) history.push({
        url: parsed.url, title: item.title, sourceSessionId: item.sourceSessionId, updatedAt: item.updatedAt,
      })
    }
    return { history: history.sort((a, b) => b.updatedAt - a.updatedAt) }
  } catch { return { history: [], message: { zh: '无法读取本地网页聊天历史；已有网页聊天不受影响。', en: 'Cannot read local Web Chat history. Your chats on DeepSeek are unaffected.' } } }
}

/** 只管理网页导航、冻结的发送意图和历史元数据，不保存聊天正文或登录凭据。 */
export class WebChatController {
  private state: WebChatState
  private readonly listeners = new Set<() => void>()
  private binding: { sourceSessionId: string; url: string } | undefined
  private intent: PromptIntent | undefined
  private sending: SendObservation | undefined
  private releaseParent: (() => void) | undefined
  private disposed = false
  private readonly unsubscribeTarget: () => void

  constructor(
    private readonly port: WebChatPort,
    private readonly prepare: PrepareDetails,
    private readonly source: Pick<DshSideChatSessions, 'selectionIsCurrent' | 'retainParent' | 'currentSessionId'
      | 'title' | 'subscribeList' | 'addWebChatToConversation' | 'focusConversationInput' | 'notify'>,
    private readonly storage: HistoryStorage,
    private readonly saveReference: SaveWebChatReference,
    private readonly text: Localize = zh => zh,
  ) {
    this.state = { visible: false, hasOpened: false, busy: false, ...readHistory(storage) }
    this.refreshReferenceTarget()
    this.unsubscribeTarget = source.subscribeList(() => { this.refreshReferenceTarget() })
  }
  readonly getSnapshot = (): WebChatState => this.state
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  show(): void { this.update({ visible: true, hasOpened: true }) }
  hide(): void { this.update({ visible: false }) }
  dispose(): void {
    this.disposed = true
    this.unsubscribeTarget()
    this.releaseSource()
    this.intent = undefined
    this.binding = undefined
    this.sending = undefined
    this.state = { visible: false, hasOpened: false, busy: false, history: this.state.history }
    this.listeners.clear()
  }
  cancelPending(): void {
    if (this.disposed || this.state.busy) return
    this.intent = undefined
    this.update({ pending: undefined, message: undefined })
  }
  async addToDsh(): Promise<void> {
    if (this.disposed || this.state.busy || this.state.pending !== undefined) return
    const target = this.source.currentSessionId()
    const expectedUrl = this.state.currentUrl
    if (target === undefined) { this.update({ message: { zh: '请先打开要接收引用的 DSH 主会话。', en: 'Open the DSH conversation that should receive the reference first.' } }); return }
    if (expectedUrl === undefined) { this.update({ message: { zh: '请先打开一条已有问答的网页聊天。', en: 'Open a Web Chat with existing messages first.' } }); return }
    this.update({ busy: true, message: { zh: '正在保存网页讨论引用…', en: 'Saving the Web Chat reference…' } })
    try {
      const capture = await this.port.capture()
      if (this.disposed) return
      if (capture.url !== expectedUrl || this.state.currentUrl !== expectedUrl) {
        throw new WebChatMessageError({ zh: '网页聊天已切换，请重新点击“添加到 DSH”。', en: 'The Web Chat changed. Click “Add to DSH” again.' })
      }
      const saved = await this.saveReference({ sessionId: target, capture })
      if (this.disposed) return
      if (!saved.ok) throw new WebChatMessageError(webChatHostMessage(saved.error.message))
      // 只向点击时显示的目标插入；用户中途切换会话时不写入任何草稿。
      if (this.source.currentSessionId() !== target) throw new WebChatMessageError({ zh: '主会话已切换，尚未插入引用；请在目标会话重新点击“添加到 DSH”。', en: 'The main conversation changed, so no reference was inserted. Click “Add to DSH” again in the intended conversation.' })
      if (!this.source.addWebChatToConversation(target, saved.value.reference)) {
        throw new WebChatMessageError({ zh: '未能插入引用，原草稿已保留；请检查主会话输入框后重试。', en: 'Could not insert the reference. Your draft is unchanged; check the main conversation composer and try again.' })
      }
      this.update({ busy: false, visible: false, message: undefined })
      this.source.focusConversationInput(target)
      this.source.notify({ kind: 'status', text: this.text('网页讨论已添加到草稿，可补充要求后发送。', 'The Web Chat reference was added to your draft. Add any instructions before sending.') })
    } catch (error) { this.update({ busy: false, message: webChatErrorMessage(error) }) }
  }
  async newChat(): Promise<void> {
    if (this.disposed || this.state.busy) return
    this.intent = undefined
    this.binding = undefined
    this.update({ visible: true, hasOpened: true, busy: true, currentUrl: undefined,
      pending: undefined, message: { zh: '正在打开新聊天…', en: 'Opening a new chat…' } })
    try {
      await this.port.newChat()
      this.update({ busy: false, currentUrl: undefined, message: undefined })
    } catch (error) {
      this.update({ busy: false, pending: requiresLogin(error) ? { kind: 'new-chat', reason: 'login-required' } : undefined,
        message: requiresLogin(error) ? { zh: '请先在网页中登录，再点击“登录后继续”打开空白聊天。', en: 'Sign in on the webpage, then click “Continue after signing in” to open a blank chat.' } : webChatErrorMessage(error) })
    }
  }
  async openHistory(url: string): Promise<void> {
    if (this.disposed || this.state.busy) return
    const page = parseDeepSeekConversationUrl(url)
    if (page === null) { this.update({ message: { zh: '无法打开这条网页聊天链接。', en: 'Cannot open this Web Chat link.' } }); return }
    this.binding = undefined
    this.intent = undefined
    this.update({ visible: true, hasOpened: true, busy: true, currentUrl: undefined,
      pending: undefined, message: { zh: '正在打开历史聊天…', en: 'Opening a previous chat…' } })
    try {
      await this.port.open(page.url)
      if (this.disposed) return
      const previous = this.state.history.find(item => item.url === page.url)
      const saved: Pick<WebChatState, 'history' | 'message'> = previous === undefined
        ? { history: this.state.history } : this.remember(previous, previous.sourceSessionId, true)
      this.update({ ...saved, busy: false, message: saved.message })
    } catch (error) {
      this.update({ busy: false,
        pending: requiresLogin(error) ? { kind: 'open-chat', url: page.url, reason: 'login-required' } : undefined,
        message: requiresLogin(error) ? { zh: '请先在网页中登录，再点击“登录后继续”打开这条历史聊天。', en: 'Sign in on the webpage, then click “Continue after signing in” to reopen this chat.' } : webChatErrorMessage(error) })
    }
  }
  async start(selection: ConversationSelection): Promise<void> {
    if (this.disposed || this.state.busy || this.state.pending !== undefined) return
    this.update({ visible: true, hasOpened: true, busy: true, message: { zh: '正在准备更多详情…', en: 'Preparing More details…' } })
    try {
      if (!this.source.selectionIsCurrent(selection)) throw new WebChatMessageError({ zh: '选文已变化，请重新选择一条已完成的消息。', en: 'The selection changed. Select text from a completed message again.' })
      this.releaseParent = this.source.retainParent(selection.parentSessionId)
      const prepared = await this.prepare({ parentSessionId: selection.parentSessionId,
        atSeq: selection.atSeq, selectedText: selection.text })
      if (this.disposed) return
      if (!prepared.ok) throw new WebChatMessageError(webChatHostMessage(prepared.error.message))
      if (!this.source.selectionIsCurrent(selection)) throw new WebChatMessageError({ zh: '选文已变化，请重新选择一条已完成的消息。', en: 'The selection changed. Select text from a completed message again.' })
      const targetUrl = this.binding?.sourceSessionId === selection.parentSessionId
        && this.binding.url === this.state.currentUrl ? this.binding.url : undefined
      const intent: PromptIntent = { prompt: prepared.value.prompt, sourceSessionId: selection.parentSessionId, targetUrl }
      this.intent = intent
      await this.sendIntent(intent, targetUrl === undefined)
    } catch (error) { this.update({ busy: false, message: webChatErrorMessage(error) }) }
    finally { this.releaseSource() }
  }
  async resume(): Promise<void> {
    if (this.disposed || this.state.busy || this.state.pending?.reason !== 'login-required') return
    if (this.state.pending.kind === 'new-chat') { await this.newChat(); return }
    if (this.state.pending.kind === 'open-chat') { await this.openHistory(this.state.pending.url); return }
    if (this.intent === undefined) return
    this.update({ visible: true, hasOpened: true, busy: true, message: { zh: '正在继续发送更多详情…', en: 'Resuming More details…' } })
    // 登录可能改变所在网页；先恢复目标，绝不把被冻结的 prompt 发进偶然打开的聊天。
    await this.sendIntent(this.intent, true)
  }
  observePage(page: WebChatPage): void {
    if (this.disposed) return
    const url = parseDeepSeekConversationUrl(page.url)?.url
    const changed = url !== this.state.currentUrl
    if (changed) this.binding = undefined
    if (this.sending !== undefined && changed) {
      if (this.sending.expectedUrl === undefined && url !== undefined) this.sending.expectedUrl = url
      else if (url !== this.sending.expectedUrl) this.sending.diverged = true
    }
    this.update({ currentUrl: url })
    if (url !== undefined && !this.state.busy) {
      const sourceSessionId = this.binding?.sourceSessionId
        ?? this.state.history.find(item => item.url === url)?.sourceSessionId ?? null
      const saved = this.remember({ url, title: page.title }, sourceSessionId, changed)
      this.update(saved)
    }
  }
  private async sendIntent(intent: PromptIntent, navigate: boolean): Promise<void> {
    let attempted = false
    try {
      if (navigate) {
        this.binding = undefined
        this.update({ currentUrl: undefined })
        if (intent.targetUrl === undefined) await this.port.newChat()
        else await this.port.open(intent.targetUrl)
      }
      if (this.disposed) return
      const observation: SendObservation = { expectedUrl: intent.targetUrl, diverged: false }
      this.sending = observation
      attempted = true
      this.update({ message: { zh: '正在发送更多详情…', en: 'Sending More details…' } })
      const result = await this.port.send(intent.prompt, intent.targetUrl)
      if (this.disposed) return
      const parsed = parseDeepSeekConversationUrl(result.url)
      if (parsed === null) throw new WebChatMessageError({ zh: '网页未返回可确认的 DeepSeek 聊天地址。', en: 'The webpage did not return a verifiable DeepSeek chat URL.' })
      const matched = !observation.diverged && (observation.expectedUrl === undefined || observation.expectedUrl === parsed.url)
      this.sending = undefined
      this.intent = undefined
      if (matched) this.binding = { sourceSessionId: intent.sourceSessionId, url: parsed.url }
      else this.binding = undefined
      const saved = this.remember({ url: parsed.url, title: result.title }, intent.sourceSessionId, true)
      this.update({ ...saved, busy: false, pending: undefined,
        currentUrl: matched ? parsed.url : this.state.currentUrl,
        message: saved.message ?? (matched ? undefined : { zh: '已发送，但网页已切换；下次更多详情将新建聊天。', en: 'Sent, but the webpage changed. More details will start a new chat next time.' }) })
    } catch (error) {
      if (this.disposed) return
      this.binding = undefined
      this.sending = undefined
      const login = requiresLogin(error)
      const detail = webChatErrorMessage(error)
      this.update({ busy: false, pending: { kind: 'prompt', prompt: intent.prompt,
        sourceSessionId: intent.sourceSessionId, reason: login ? 'login-required' : 'unconfirmed' },
      message: login ? { zh: '请先在网页中登录，再点击“登录后继续”；待发送内容已保留。', en: 'Sign in on the webpage, then click “Continue after signing in”. The pending message has been kept.' }
        : { zh: `${attempted ? '发送结果未确认，请先查看网页，避免重复发送' : '尚未发送，请先检查网页'}：${renderWebChatMessage(detail, zh => zh)}`,
          en: `${attempted ? 'Sending is unconfirmed. Check the webpage before sending again to avoid duplicates' : 'Not sent. Check the webpage first'}: ${renderWebChatMessage(detail, (_zh, en) => en)}` } })
    }
  }
  private remember(page: WebChatPage, sourceSessionId: string | null, refresh: boolean): Pick<WebChatState, 'history' | 'message'> {
    const previous = this.state.history.find(item => item.url === page.url)
    if (!refresh && previous?.title === page.title && previous.sourceSessionId === sourceSessionId) return { history: this.state.history }
    const history = [{ ...page, sourceSessionId, updatedAt: Date.now() }, ...this.state.history.filter(item => item.url !== page.url)]
    try {
      this.storage.setItem(WEBCHAT_HISTORY_STORAGE_KEY, JSON.stringify(history))
      return { history }
    } catch { return { history, message: { zh: '聊天仍可使用，但无法保存本地历史。', en: 'You can continue chatting, but local history could not be saved.' } } }
  }
  private releaseSource(): void {
    const release = this.releaseParent
    this.releaseParent = undefined
    release?.()
  }
  private refreshReferenceTarget(): void {
    const sessionId = this.source.currentSessionId()
    const referenceTarget = sessionId === undefined ? undefined
      : { sessionId, title: this.source.title(sessionId) ?? '' }
    if (referenceTarget?.sessionId === this.state.referenceTarget?.sessionId
      && referenceTarget?.title === this.state.referenceTarget?.title) return
    this.update({ referenceTarget })
  }
  private update(patch: Partial<WebChatState>): void {
    if (this.disposed) return
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }
}
