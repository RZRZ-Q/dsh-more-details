// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chat.deepseek.com"}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deepSeekNewChatScript, deepSeekProbeScript, deepSeekReceiptScript, deepSeekSendScript,
  parseDeepSeekConversationUrl,
  type DeepSeekActionResult, type DeepSeekPageSnapshot, type DeepSeekReceipt,
} from '../../src/client/webchat/deepseek-page.js'

const origin = 'https://chat.deepseek.com'
// 官网公开脚本模块 47843 的 Yp 图标，保留完整路径以覆盖真实窄屏结构。
const mobileNewChatPath = 'M9.99994 1.22943C5.15598 1.22943 1.22937 5.15604 1.22937 10C1.22937 11.3437 1.5319 12.6189 2.07359 13.7592L2.40673 14.4596L3.8065 13.7942L3.4743 13.0939L3.31625 12.7371C2.97051 11.8938 2.77962 10.97 2.77962 10C2.77962 6.01243 6.01237 2.77968 9.99994 2.77968C13.9875 2.77968 17.2203 6.01243 17.2203 10C17.2203 13.9876 13.9875 17.2203 9.99994 17.2203C9.18334 17.2203 8.5858 17.1622 8.05597 17.0159C7.53397 16.8717 7.03885 16.6305 6.44609 16.2171C5.57744 15.6112 4.33224 15.3975 3.30584 16.0458L3.28975 16.0562L3.27366 16.0676L2.59034 16.5484L3.10425 18.0825L4.14438 17.35C4.51831 17.1207 5.07296 17.1507 5.55834 17.4891C6.26058 17.9789 6.91499 18.3092 7.64333 18.5103C8.3639 18.7093 9.11779 18.7706 9.99994 18.7706C14.8439 18.7706 18.7705 14.844 18.7705 10C18.7705 5.15604 14.8439 1.22943 9.99994 1.22943ZM9.21913 6.36949V9.22487H6.36943V10.7751H9.21913V13.6305H10.7694V10.7751H13.6304V9.22487H10.7694V6.36949H9.21913Z'
// 直接执行交付给 webview 的脚本，避免只验证生成的字符串。
function execute<T>(script: string): Promise<T> { return window.eval(script) as Promise<T> }
function user(text: string, id = 'u1'): string {
  return `<div data-virtual-list-item-key="${id}"><div class="ds-message"><div class="ds-collapsible-text"><div><span>${text}</span></div></div></div></div>`
}
function setup(html = ''): HTMLTextAreaElement {
  document.body.innerHTML = `<aside><div role="button">开启新对话</div></aside><main>${html}</main><textarea class="ds-textarea__textarea"></textarea><button aria-label="发送"></button>`
  return document.querySelector('textarea')!
}
const probe = (): Promise<DeepSeekPageSnapshot> => execute(deepSeekProbeScript())
function observeInteractionListeners() {
  const add = vi.spyOn(window, 'addEventListener')
  return {
    trusted(type: string): void {
      const registration = add.mock.calls.findLast(([event]) => event === type)
      const listener = registration?.[1]
      if (typeof listener !== 'function') throw new Error('未注册交互监听')
      // JSDOM 不能产生系统输入；向实际注册的回调传入浏览器的 trusted 标志。
      listener.call(window, { isTrusted: true } as Event)
    },
    signals(): AbortSignal[] {
      return add.mock.calls.filter(([type]) => type === 'pointerdown')
        .map(([, , options]) => (options as AddEventListenerOptions).signal!)
    },
  }
}

beforeEach(() => {
  history.replaceState(null, '', '/')
  document.title = 'DeepSeek'
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 100,
    bottom: 30, width: 100, height: 30, toJSON: () => ({}) })
})
afterEach(() => {
  document.body.innerHTML = ''
  const page = document as Document & { __dshMoreDetailsSubmission?: { stopObserving(): void } }
  page.__dshMoreDetailsSubmission?.stopObserving()
  delete page.__dshMoreDetailsSubmission
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('DeepSeek 网页 DOM 适配', () => {
  it('读取官网用户/助手正文及 URL，不把页面按钮文字混入消息', async () => {
    setup(user('问题') + '<div class="ds-message"><div class="ds-assistant-message-main-content">答案</div><button>复制</button></div>')
    history.replaceState(null, '', '/a/chat/s/chat-1?temporary=secret#part')
    const state = await probe()
    expect(state).toMatchObject({ url: `${origin}/a/chat/s/chat-1`, conversationId: 'chat-1', login: 'ready',
      messageRead: 'supported', generating: false, canCreate: true, composerPresent: true, composerEmpty: true })
    expect(state.messages).toEqual([{ id: 'u1', role: 'user', text: '问题' }, { id: null, role: 'assistant', text: '答案' }])
  })

  it('登录页和未知消息结构不被当作可发送页面', async () => {
    document.body.innerHTML = '<button>登录</button>'
    history.replaceState(null, '', '/sign_in')
    expect(await probe()).toMatchObject({ login: 'required', composerPresent: false })
    expect(await execute(deepSeekNewChatScript(`${origin}/sign_in`))).toMatchObject({ status: 'blocked', reason: 'login-required' })
    history.replaceState(null, '', '/a/chat/s/old')
    setup('<div class="ds-message"><p>无法辨认的消息</p></div>')
    expect(await probe()).toMatchObject({ messageRead: 'unsupported', messages: [] })
    expect(await execute(deepSeekSendScript({ requestId: 'x', text: '问题', expectedUrl: `${origin}/a/chat/s/old` })))
      .toMatchObject({ status: 'blocked', reason: 'messages-unsupported' })
  })

  it('点击真实新聊天控件，不把首页导航或正文中的同名文字当作入口', async () => {
    setup(user('开启新对话'))
    history.replaceState(null, '', '/a/chat/s/old')
    const clicked = vi.fn(() => { history.replaceState(null, '', '/'); document.querySelector('main')!.innerHTML = '' })
    document.querySelector('aside [role="button"]')!.addEventListener('click', clicked)
    expect(await execute(deepSeekNewChatScript(`${origin}/a/chat/s/old`))).toMatchObject({ status: 'dispatched' })
    expect(clicked).toHaveBeenCalledTimes(1)
    expect(await probe()).toMatchObject({ conversationId: null, messages: [] })
    document.querySelector('aside')!.remove()
    document.querySelector('main')!.innerHTML = user('开启新对话')
    expect(await execute(deepSeekNewChatScript(origin + '/'))).toMatchObject({ status: 'blocked', reason: 'new-chat-unavailable' })
  })

  it('窄屏无名称图标通过官网顶部结构和完整 SVG 定位，不使用按钮顺序', async () => {
    setup()
    document.querySelector('aside')!.remove()
    document.body.insertAdjacentHTML('afterbegin', `<div class="_1aa2651 the-header">
      <div class="ds-button ds-button--icon" role="button" id="new-chat"><div class="ds-button__icon"><svg viewBox="0 0 20 20"><path d="${mobileNewChatPath}"></path></svg></div></div>
      <div class="ds-button ds-button--icon" role="button" id="menu"><svg viewBox="0 0 20 20"><path d="M0 0H20"></path></svg></div>
    </div>`)
    const newChat = vi.fn()
    const menu = vi.fn()
    document.querySelector('#new-chat')!.addEventListener('click', newChat)
    document.querySelector('#menu')!.addEventListener('click', menu)
    expect(await probe()).toMatchObject({ canCreate: true })
    expect(await execute(deepSeekNewChatScript(origin + '/'))).toMatchObject({ status: 'dispatched' })
    expect(newChat).toHaveBeenCalledTimes(1)
    expect(menu).not.toHaveBeenCalled()
    document.querySelector('#new-chat')!.classList.add('ds-button--disabled')
    expect(await probe()).toMatchObject({ canCreate: false })
  })

  it('同一个 SVG 出现在消息正文或未知结构中不会被当作新聊天', async () => {
    setup()
    document.querySelector('aside')!.remove()
    const icon = `<div class="ds-button ds-button--icon" role="button"><svg viewBox="0 0 20 20"><path d="${mobileNewChatPath}"></path></svg></div>`
    document.querySelector('main')!.innerHTML = `<div>${icon}</div><div class="ds-message"><div class="_1aa2651 the-header">${icon}</div></div>`
    expect(await probe()).toMatchObject({ canCreate: false })
    expect(await execute(deepSeekNewChatScript(origin + '/'))).toMatchObject({ status: 'blocked', reason: 'new-chat-unavailable' })
  })

  it('保留未发送草稿，拒绝生成中与已经切换的页面', async () => {
    const input = setup()
    input.value = '手写草稿'
    expect(await execute(deepSeekSendScript({ requestId: 'x', text: '自动问题', expectedUrl: origin + '/' })))
      .toMatchObject({ status: 'blocked', reason: 'draft-present' })
    expect(input.value).toBe('手写草稿')
    input.value = ''
    document.querySelector('button')!.setAttribute('aria-label', '停止生成')
    expect(await probe()).toMatchObject({ generating: true })
    expect(await execute(deepSeekNewChatScript(origin + '/'))).toMatchObject({ status: 'blocked', reason: 'generating' })
    expect(await execute(deepSeekNewChatScript(origin + '/a/chat/s/other'))).toMatchObject({ status: 'blocked', reason: 'target-changed' })
  })

  it('通过原生 setter 更新受控输入框，单次 Enter 后用用户消息与真实 ID 确认', async () => {
    const input = setup()
    const events: string[] = []
    input.addEventListener('input', () => { events.push(input.value) })
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return
      events.push('send')
      document.querySelector('main')!.innerHTML = user(input.value)
      history.replaceState(null, '', '/a/chat/s/new-chat')
      input.value = ''
    })
    const text = '解释 `代码` 和 ${不能执行}。\r\n第二行'
    const entered = text.replace(/\r\n/g, '\n')
    expect(await execute(deepSeekSendScript({ requestId: 'once', text, expectedUrl: origin + '/' }))).toMatchObject({ status: 'dispatched' })
    const receipt = await execute<DeepSeekReceipt>(deepSeekReceiptScript('once'))
    expect(events).toEqual([entered, 'send'])
    expect(receipt).toMatchObject({ status: 'accepted', message: { role: 'user', text: entered }, snapshot: { conversationId: 'new-chat' } })
  })

  it('输入框清空、助手复述及 URL 单独变化均不能充当接收回执', async () => {
    const input = setup()
    input.addEventListener('keydown', () => { input.value = '' })
    await execute(deepSeekSendScript({ requestId: 'uncertain', text: '同一个问题', expectedUrl: origin + '/' }))
    expect(await execute(deepSeekReceiptScript('uncertain'))).toMatchObject({ status: 'pending' })
    history.replaceState(null, '', '/a/chat/s/new-chat')
    document.querySelector('main')!.innerHTML = '<div class="ds-message"><div class="ds-assistant-message-main-content">同一个问题</div></div>'
    expect(await execute(deepSeekReceiptScript('uncertain'))).toMatchObject({ status: 'pending' })
  })

  it('旧的相同问题不算新回执，重复执行同一 request 不会再发送', async () => {
    const input = setup(user('相同问题', 'old-user'))
    history.replaceState(null, '', '/a/chat/s/existing')
    const sent = vi.fn(() => { input.value = '' })
    input.addEventListener('keydown', sent)
    const request = { requestId: 'same', text: '相同问题', expectedUrl: `${origin}/a/chat/s/existing` }
    await execute(deepSeekSendScript(request))
    expect(await execute(deepSeekReceiptScript('same'))).toMatchObject({ status: 'pending' })
    expect(await execute(deepSeekSendScript(request))).toMatchObject({ status: 'already-dispatched' })
    expect(sent).toHaveBeenCalledTimes(1)
    document.querySelector('main')!.insertAdjacentHTML('beforeend', user('相同问题', 'new-user'))
    expect(await execute(deepSeekReceiptScript('same'))).toMatchObject({ status: 'accepted', message: { id: 'new-user' } })
    history.replaceState(null, '', '/a/chat/s/other')
    expect(await execute(deepSeekReceiptScript('same'))).toMatchObject({ status: 'target-changed' })
    await execute(deepSeekNewChatScript(`${origin}/a/chat/s/other`))
    expect(await execute(deepSeekReceiptScript('same'))).toMatchObject({ status: 'unknown' })
  })

  it('等待官网输入更新时切换会话，不向新目标发送', async () => {
    const input = setup()
    const sent = vi.fn()
    input.addEventListener('keydown', sent)
    const pending = execute<DeepSeekActionResult>(deepSeekSendScript({ requestId: 'switch', text: '问题', expectedUrl: origin + '/' }))
    history.replaceState(null, '', '/a/chat/s/another')
    expect(await pending).toMatchObject({ status: 'blocked', reason: 'target-changed' })
    expect(sent).not.toHaveBeenCalled()
    expect(await execute(deepSeekReceiptScript('switch'))).toMatchObject({ status: 'unknown' })
  })

  it.each(['pointerdown', 'keydown', 'wheel', 'popstate'])('发送后发生真实 %s，不把同文旧聊天认作新回执', async type => {
    const input = setup()
    const sent = vi.fn(() => { input.value = '' })
    input.addEventListener('keydown', sent)
    const listeners = observeInteractionListeners()
    await execute(deepSeekSendScript({ requestId: 'navigate', text: '重复问题', expectedUrl: origin + '/' }))
    listeners.trusted(type)
    history.replaceState(null, '', '/a/chat/s/old-chat')
    document.querySelector('main')!.innerHTML = user('重复问题', 'old-user')
    expect(await execute(deepSeekReceiptScript('navigate'))).toMatchObject({ status: 'unknown', message: null })
    expect(await execute(deepSeekReceiptScript('navigate'))).toMatchObject({ status: 'unknown' })
    expect(sent).toHaveBeenCalledTimes(1)
    expect(listeners.signals().map(signal => signal.aborted)).toEqual([true])
  })

  it('准备发送期间用户操作会取消自动 Enter，并清理监听', async () => {
    const input = setup()
    const sent = vi.fn()
    input.addEventListener('keydown', sent)
    const listeners = observeInteractionListeners()
    const pending = execute(deepSeekSendScript({ requestId: 'editing', text: '问题', expectedUrl: origin + '/' }))
    listeners.trusted('beforeinput')
    expect(await pending).toMatchObject({ status: 'blocked', reason: 'user-interrupted' })
    expect(sent).not.toHaveBeenCalled()
    expect(listeners.signals().map(signal => signal.aborted)).toEqual([true])
  })

  it('忽略程序事件；接收成功后清理监听并锁定已证实的会话', async () => {
    const input = setup()
    input.addEventListener('keydown', () => { input.value = '' })
    const listeners = observeInteractionListeners()
    await execute(deepSeekSendScript({ requestId: 'programmatic', text: '问题', expectedUrl: origin + '/' }))
    window.dispatchEvent(new MouseEvent('pointerdown'))
    history.replaceState(null, '', '/a/chat/s/new-chat')
    document.querySelector('main')!.innerHTML = user('问题', 'new-user')
    expect(await execute(deepSeekReceiptScript('programmatic'))).toMatchObject({ status: 'accepted' })
    expect(listeners.signals().map(signal => signal.aborted)).toEqual([true])
    history.replaceState(null, '', '/a/chat/s/other-chat')
    document.querySelector('main')!.innerHTML = user('问题', 'other-user')
    expect(await execute(deepSeekReceiptScript('programmatic'))).toMatchObject({ status: 'target-changed' })
  })

  it('新建及后续发送都移除旧监听，不堆积同一文档的挂起请求', async () => {
    const input = setup()
    input.addEventListener('keydown', () => { input.value = '' })
    const listeners = observeInteractionListeners()
    await execute(deepSeekSendScript({ requestId: 'first', text: '问题一', expectedUrl: origin + '/' }))
    expect(listeners.signals().map(signal => signal.aborted)).toEqual([false])
    await execute(deepSeekNewChatScript(origin + '/'))
    expect(listeners.signals().map(signal => signal.aborted)).toEqual([true])
    await execute(deepSeekSendScript({ requestId: 'second', text: '问题二', expectedUrl: origin + '/' }))
    await execute(deepSeekSendScript({ requestId: 'third', text: '问题三', expectedUrl: origin + '/' }))
    expect(listeners.signals().map(signal => signal.aborted)).toEqual([true, true, false])
    expect(await execute(deepSeekReceiptScript('second'))).toMatchObject({ status: 'unknown' })
  })

  it('不使用隐藏或含糊的新聊天入口，非官网不读内容', async () => {
    setup()
    document.querySelector('aside')!.setAttribute('hidden', '')
    expect(await probe()).toMatchObject({ canCreate: false })
    document.querySelector('aside')!.removeAttribute('hidden')
    document.body.insertAdjacentHTML('beforeend', '<button>New chat</button>')
    expect(await probe()).toMatchObject({ canCreate: false })
    vi.stubGlobal('location', { origin: 'https://example.com', pathname: '/private' })
    expect(await probe()).toMatchObject({ login: 'unknown', messages: [], messageRead: 'unsupported', title: '' })
    vi.unstubAllGlobals()
  })
})

describe('DeepSeek 会话地址', () => {
  it('只保留官网真实会话路径，不输出 query/hash 或凭据', () => {
    expect(parseDeepSeekConversationUrl(`${origin}/a/chat/s/real-1/?token=private#secret`))
      .toEqual({ url: `${origin}/a/chat/s/real-1`, conversationId: 'real-1' })
    for (const raw of [origin, 'https://example.com/a/chat/s/x', 'https://user:pass@chat.deepseek.com/a/chat/s/x',
      `${origin}/a/chat/s/x/more`, `${origin}/a/chat/s/a%2Fb`, 'not a URL']) expect(parseDeepSeekConversationUrl(raw)).toBeNull()
  })
})
