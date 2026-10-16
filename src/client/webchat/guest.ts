import {
  deepSeekNewChatScript, deepSeekProbeScript, deepSeekReceiptScript, deepSeekSendScript,
  type DeepSeekActionResult, type DeepSeekPageSnapshot, type DeepSeekReceipt,
} from './deepseek-page.js'
import type { WebChatPort } from './controller.js'
import type { WebChatLoginStore } from '../../shared/webchat-login.js'
import type { WebChatCapture } from '../../shared/webchat-reference.js'
import { deepSeekCaptureScript, type DeepSeekCaptureResult } from './deepseek-capture.js'
import {
  deepSeekReadLoginScript, deepSeekRestoreLoginScript,
  type DeepSeekLoginReadResult, type DeepSeekLoginRestoreResult,
} from './login-page.js'

const HOME = 'https://chat.deepseek.com/'
interface Reservation { lease: string; partition: string }
interface BrowserBridge {
  acquire(workspace: string): Promise<Reservation>
  release(lease: string): Promise<void>
  onOpenRequested(lease: string, listener: (url: string) => void): () => void
}
interface Webview extends HTMLElement {
  loadURL(url: string): Promise<void>
  getURL(): string
  executeJavaScript<T>(script: string, userGesture?: boolean): Promise<T>
}
function loginRequired(): Error {
  return Object.assign(new Error('请先在小窗内登录 DeepSeek 网页账号，然后点击“登录后继续”。'), { code: 'login-required' })
}
function blockedAction(reason: string | null, fallback: string): Error {
  if (reason === 'login-required') return loginRequired()
  const messages: Readonly<Record<string, string>> = {
    'wrong-origin': '当前页面不是 DeepSeek 官网，请重新打开网页聊天。',
    'target-changed': '网页已切换，未发送本次请求。请重新选择目标聊天。',
    'page-not-ready': '网页尚未就绪，请等待页面加载完成。',
    generating: '当前网页仍在回答，请等回答完成或在网页中停止生成。',
    'draft-present': '网页输入框中已有未发送的内容，请先处理该草稿。',
    'new-chat-unavailable': '没有找到网页的新聊天入口。',
    'empty-request': '待发送内容为空。',
    'messages-unsupported': '暂时无法辨认网页消息，未发送本次请求。',
    'composer-unavailable': '网页输入框暂时不可用，请检查页面状态。',
    'composer-changed': '网页草稿已变化，未发送本次请求。',
  }
  return new Error(reason === null ? fallback : messages[reason] ?? fallback)
}

/** 官方临时 guest + 插件专用凭据：只保存官网登录白名单，不保存 Cookie 或整个浏览器资料。 */
export class DeepSeekGuest implements WebChatPort {
  private element: Webview | undefined
  private reservation: Reservation | undefined
  private bridge: BrowserBridge | undefined
  private opening: Promise<void> | undefined
  private disposed = false
  private poll: ReturnType<typeof setInterval> | undefined
  private unsubscribe: (() => void) | undefined
  private probing = false
  private container: HTMLElement | undefined
  private lastFailure: string | undefined
  private preparedUrl: string | undefined
  private onPage: (page: DeepSeekPageSnapshot) => void = () => {}
  private loginMessage = ''
  private readonly loginListeners = new Set<() => void>()
  private lastSavedLogin: string | null = null
  private canClearLogin = false

  constructor(private readonly loginStore: WebChatLoginStore) {}

  readonly getLoginMessage = (): string => this.loginMessage
  readonly subscribeLogin = (listener: () => void): (() => void) => {
    this.loginListeners.add(listener)
    return () => { this.loginListeners.delete(listener) }
  }
  private setLoginMessage(message: string): void {
    if (this.disposed || this.loginMessage === message) return
    this.loginMessage = message
    for (const listener of this.loginListeners) listener()
  }

  attach(container: HTMLElement): void { this.container = container }
  observe(listener: (page: DeepSeekPageSnapshot) => void): void { this.onPage = listener }

  private assertLive(): void {
    if (this.disposed) throw new Error('Web Chat 插件已卸载。')
  }
  private async ensure(): Promise<void> {
    this.assertLive()
    this.opening ??= this.createGuest().catch(async (error: unknown) => {
      try { await this.releaseGuest() }
      finally { this.opening = undefined }
      throw error
    })
    await this.opening
    this.assertLive()
  }
  private async createGuest(): Promise<void> {
    this.lastFailure = undefined
    this.preparedUrl = undefined
    const desktop = (globalThis as unknown as { dshDesktop?: { protocolVersion: number; browser: BrowserBridge } }).dshDesktop
    if (desktop?.protocolVersion !== 1) throw new Error('Web Chat 需要官方 DSH 桌面端的浏览器接口。')
    if (this.container === undefined) throw new Error('Web Chat 面板尚未挂载。')
    this.bridge = desktop.browser
    const reservation = await desktop.browser.acquire('dsh-more-details-webchat')
    if (this.disposed) { await desktop.browser.release(reservation.lease); return }
    this.reservation = reservation
    const element = document.createElement('webview') as Webview
    this.element = element
    element.setAttribute('name', reservation.lease)
    element.setAttribute('partition', reservation.partition)
    element.setAttribute('src', `about:blank#${reservation.lease}`)
    element.setAttribute('aria-label', 'DeepSeek 网页聊天')
    element.setAttribute('allowpopups', '')
    const ready = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('DSH 浏览器组件未能启动。')), 15000)
      element.addEventListener('dom-ready', () => { clearTimeout(timeout); resolve() }, { once: true })
    })
    element.addEventListener('did-fail-load', event => {
      const failure = event as Event & { errorCode: number; errorDescription: string; isMainFrame: boolean }
      if (failure.isMainFrame && failure.errorCode !== -3) this.lastFailure = failure.errorDescription
    })
    for (const event of ['did-navigate', 'did-navigate-in-page', 'did-finish-load']) {
      element.addEventListener(event, () => {
        // 恢复尚未结束时不能采集空白登录页；之后及时跟随官网登录与注销。
        if (this.poll !== undefined) void this.observeNow()
      })
    }
    this.unsubscribe = desktop.browser.onOpenRequested(reservation.lease, url => {
      if (new URL(url).origin === new URL(HOME).origin) {
        void element.loadURL(url).catch(error => { this.lastFailure = String(error) })
      }
    })
    this.container.append(element)
    await ready
    this.assertLive()
    let saved: Awaited<ReturnType<WebChatLoginStore['read']>> = null
    this.canClearLogin = false
    try {
      saved = await this.loginStore.read()
      this.lastSavedLogin = saved === null ? null : JSON.stringify(saved)
      this.canClearLogin = true
    } catch {
      this.setLoginMessage('无法读取已保存的登录，请在网页中登录。')
    }
    this.assertLive()
    await element.loadURL(HOME)
    this.assertLive()
    if (saved !== null) {
      this.setLoginMessage('正在恢复网页登录…')
      const restored = await element.executeJavaScript<DeepSeekLoginRestoreResult>(deepSeekRestoreLoginScript(saved))
      this.assertLive()
      if (restored.status === 'restored') {
        // 官网在启动时读取登录数据；写入后必须重新加载，交由官网验证令牌。
        await element.loadURL(HOME)
        this.assertLive()
      } else if (restored.status === 'wrong-origin' || restored.status === 'invalid-state') {
        this.canClearLogin = false
        this.setLoginMessage('未能恢复已保存的登录，请在网页中登录。')
      }
    }
    await this.syncLogin()
    this.assertLive()
    this.poll = setInterval(() => { void this.observeNow() }, 1500)
  }
  private async syncLogin(): Promise<void> {
    const element = this.element
    if (this.disposed || element === undefined) return
    let state: DeepSeekLoginReadResult
    try { state = await element.executeJavaScript<DeepSeekLoginReadResult>(deepSeekReadLoginScript()) }
    catch { this.setLoginMessage('暂时无法检查网页登录，下次检查会继续。'); return }
    if (this.disposed) return
    if (state.status === 'authenticated' && state.state !== null) {
      const serialized = JSON.stringify(state.state)
      try {
        if (serialized !== this.lastSavedLogin) await this.loginStore.save(state.state)
        if (this.disposed) return
        this.lastSavedLogin = serialized
        this.canClearLogin = true
        this.setLoginMessage('已记住网页登录，重启后自动恢复。')
      } catch { this.setLoginMessage('无法保存网页登录，重启后需重新登录。') }
    } else if (state.status === 'signed-out' && this.canClearLogin) {
      try {
        if (this.lastSavedLogin !== null) await this.loginStore.clear()
        if (this.disposed) return
        this.lastSavedLogin = null
        this.setLoginMessage('请在网页中登录；成功后会记住登录。')
      } catch { this.setLoginMessage('未能清除已失效的登录，请稍后重试。') }
    }
  }
  private async observeNow(): Promise<void> {
    if (this.disposed || this.probing || this.element === undefined) return
    this.probing = true
    try { await this.probe(); await this.syncLogin() }
    catch (error) { this.lastFailure = error instanceof Error ? error.message : String(error) }
    finally { this.probing = false }
  }
  private async probe(): Promise<DeepSeekPageSnapshot> {
    this.assertLive()
    const page = await this.element!.executeJavaScript<DeepSeekPageSnapshot>(deepSeekProbeScript())
    this.assertLive()
    this.onPage(page)
    return page
  }
  private async waitFor(predicate: (page: DeepSeekPageSnapshot) => boolean, timeout = 25000): Promise<DeepSeekPageSnapshot> {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      const page = await this.probe()
      if (page.login === 'required') throw loginRequired()
      if (predicate(page)) return page
      if (this.lastFailure !== undefined) throw new Error(`网页加载失败：${this.lastFailure}`)
      await new Promise(resolve => setTimeout(resolve, 350))
    }
    throw new Error('网页尚未就绪，请查看小窗中的页面状态。')
  }
  async newChat(): Promise<void> {
    await this.ensure()
    const before = await this.waitFor(page => page.login === 'ready' && page.composerPresent)
    if (before.generating) throw new Error('当前网页仍在回答，请等回答完成或在网页中停止生成。')
    const action = await this.element!.executeJavaScript<DeepSeekActionResult>(deepSeekNewChatScript(before.url), true)
    if (action.status === 'blocked') throw blockedAction(action.reason, '没有找到网页的新聊天入口。')
    const blank = await this.waitFor(page => page.login === 'ready' && page.conversationId === null && page.composerEmpty && page.messages.length === 0)
    this.preparedUrl = blank.url
  }
  async send(prompt: string, expectedUrl?: string): Promise<{ url: string; title: string }> {
    await this.ensure()
    const page = await this.waitFor(value => value.login === 'ready' && value.composerPresent)
    const target = expectedUrl ?? this.preparedUrl
    if (target === undefined || page.url !== target) throw new Error('网页已切换，未发送本次请求。请重新选择目标聊天。')
    const requestId = crypto.randomUUID()
    const action = await this.element!.executeJavaScript<DeepSeekActionResult>(deepSeekSendScript({ requestId, text: prompt, expectedUrl: target }), true)
    if (action.status === 'blocked') throw blockedAction(action.reason, '网页未接受发送操作。')
    const deadline = Date.now() + 30000
    while (Date.now() < deadline) {
      this.assertLive()
      const receipt = await this.element!.executeJavaScript<DeepSeekReceipt>(deepSeekReceiptScript(requestId))
      if (receipt.status === 'accepted') {
        await this.probe()
        return { url: receipt.snapshot.url, title: receipt.snapshot.title || 'DeepSeek Chat' }
      }
      if (receipt.status === 'target-changed' || receipt.status === 'unknown') throw new Error('发送目标发生变化，结果未确认。')
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    throw new Error('未能确认网页收到这条消息，请查看聊天内容；不会自动重复发送。')
  }
  async open(url: string): Promise<void> {
    if (new URL(url).origin !== new URL(HOME).origin) throw new Error('只能打开 DeepSeek 网页聊天。')
    await this.ensure()
    this.lastFailure = undefined
    await this.element!.loadURL(url)
    await this.waitFor(page => page.login === 'ready' && page.url.split(/[?#]/)[0] === url && page.composerPresent)
  }
  async capture(): Promise<WebChatCapture> {
    this.assertLive()
    const element = this.element
    if (element === undefined) throw new Error('请先打开要引用的网页聊天。')
    // 引用只读当前 guest，不初始化网页、恢复登录或改变当前聊天。
    const expectedUrl = element.getURL().split(/[?#]/)[0]!.replace(/\/$/, '')
    const result = await element.executeJavaScript<DeepSeekCaptureResult>(deepSeekCaptureScript(expectedUrl))
    this.assertLive()
    if (this.element !== element || element.getURL().split(/[?#]/)[0]!.replace(/\/$/, '') !== expectedUrl) {
      throw new Error('网页已切换，请确认目标聊天后重新添加。')
    }
    if (!result.ok) throw new Error(result.reason)
    return result.capture
  }
  async dispose(): Promise<void> {
    this.disposed = true
    this.loginListeners.clear()
    this.lastSavedLogin = null
    await this.releaseGuest()
  }
  private async releaseGuest(): Promise<void> {
    if (this.poll !== undefined) clearInterval(this.poll)
    this.poll = undefined
    this.unsubscribe?.()
    this.unsubscribe = undefined
    const element = this.element
    const reservation = this.reservation
    this.element = undefined
    this.reservation = undefined
    element?.remove()
    if (reservation !== undefined) await this.bridge!.release(reservation.lease)
  }
}
