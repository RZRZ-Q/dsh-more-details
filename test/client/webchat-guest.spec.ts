// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { DeepSeekGuest } from '../../src/client/webchat/guest.js'
import type { DeepSeekPageSnapshot } from '../../src/client/webchat/deepseek-page.js'
import type { DeepSeekLoginReadResult } from '../../src/client/webchat/login-page.js'
import type { WebChatLoginState } from '../../src/shared/webchat-login.js'
import type { WebChatCapture } from '../../src/shared/webchat-reference.js'
import { deferred } from '../fixtures/client-runtime.js'

// 这里只模拟原生 webview 的生命周期和已定义返回契约，不验证官网 DOM 或真实发送。
vi.mock('../../src/client/webchat/deepseek-page.js', () => ({
  deepSeekProbeScript: () => 'probe',
  deepSeekNewChatScript: () => 'new-chat',
  deepSeekSendScript: () => 'send',
  deepSeekReceiptScript: () => 'receipt',
}))
vi.mock('../../src/client/webchat/login-page.js', () => ({
  deepSeekReadLoginScript: () => 'login-read',
  deepSeekRestoreLoginScript: () => 'login-restore',
}))
vi.mock('../../src/client/webchat/deepseek-capture.js', () => ({
  deepSeekCaptureScript: (url: string) => `capture:${url}`,
}))

const savedLogin: WebChatLoginState = {
  userToken: JSON.stringify({ value: 'test-only-token', __version: '0' }),
  userInfo: JSON.stringify({ value: { id: 'test-user' }, __version: '0' }), deviceId: 'test-device',
}

const HOME = 'https://chat.deepseek.com/'
const readyPage: DeepSeekPageSnapshot = {
  url: HOME, title: 'DeepSeek', conversationId: null, login: 'ready',
  composerPresent: true, composerEmpty: true, messages: [], messageRead: 'supported',
  generating: false, canCreate: true,
}
const guests: DeepSeekGuest[] = []
interface NativeElement extends HTMLElement {
  loadURL: Mock<(url: string) => Promise<void>>
  executeJavaScript: Mock<(script: string) => Promise<unknown>>
  getURL(): string
}

function fixture() {
  const container = document.createElement('div')
  document.body.append(container)
  const elements: NativeElement[] = []
  const load = vi.fn<(url: string) => Promise<void>>().mockResolvedValue(undefined)
  const execute = vi.fn<(script: string) => Promise<unknown>>().mockImplementation(async script =>
    script === 'probe' ? readyPage : { status: 'dispatched', reason: null, snapshot: readyPage })
  const readLogin = vi.fn<() => Promise<DeepSeekLoginReadResult>>()
    .mockResolvedValue({ status: 'authenticated', state: savedLogin })
  const restoreLogin = vi.fn().mockResolvedValue({ status: 'restored' })
  const loginStore = {
    read: vi.fn<() => Promise<WebChatLoginState | null>>().mockResolvedValue(null),
    save: vi.fn<(state: WebChatLoginState) => Promise<void>>().mockResolvedValue(undefined),
    clear: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  }
  const acquire = vi.fn<() => Promise<{ lease: string; partition: string }>>()
    .mockImplementation(async () => ({ lease: `lease-${elements.length + 1}`, partition: 'process-partition' }))
  const release = vi.fn<(lease: string) => Promise<void>>().mockResolvedValue(undefined)
  const unsubscribe = vi.fn()
  vi.stubGlobal('dshDesktop', { protocolVersion: 1, browser: {
    acquire, release, onOpenRequested: vi.fn(() => unsubscribe),
  } })
  const createElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const element = createElement(tag)
    if (tag !== 'webview') return element
    const native = Object.assign(element, { loadURL: load, executeJavaScript: vi.fn(async (script: string) =>
      script === 'login-read' ? readLogin() : script === 'login-restore' ? restoreLogin() : execute(script)), getURL: () => HOME })
    elements.push(native)
    queueMicrotask(() => { native.dispatchEvent(new Event('dom-ready')) })
    return native
  })
  const guest = new DeepSeekGuest(loginStore)
  guests.push(guest)
  guest.attach(container)
  return { guest, container, elements, load, execute, acquire, release, unsubscribe, loginStore, readLogin, restoreLogin }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(async () => {
  for (const guest of guests.splice(0)) await guest.dispose()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('DeepSeek guest 生命周期与发送前错误', () => {
  it('引用未打开的网页直接报错，不为采集创建 guest 或读取登录态', async () => {
    const f = fixture()
    await expect(f.guest.capture()).rejects.toThrow('请先打开要引用的网页聊天。')
    expect(f.acquire).not.toHaveBeenCalled()
    expect(f.loginStore.read).not.toHaveBeenCalled()
    expect(f.load).not.toHaveBeenCalled()
  })

  it('采集只调用当前页读取脚本，保留网页和登录态，原样传播范围与正文', async () => {
    const f = fixture()
    await f.guest.newChat()
    const target = 'https://chat.deepseek.com/a/chat/s/discussion'
    vi.spyOn(f.elements[0]!, 'getURL').mockReturnValue(`${target}?temporary=private#position`)
    const capture: WebChatCapture = { version: 1, url: target, title: '讨论', capturedAt: '2026-10-15T06:00:00.000Z',
      scope: 'rendered-current-branch', completeness: 'partial', messages: [{ id: 'a1', role: 'assistant', content: '答案' }] }
    f.execute.mockResolvedValue({ ok: true, capture })
    f.execute.mockClear()
    f.load.mockClear()
    f.loginStore.read.mockClear()
    f.loginStore.save.mockClear()
    f.readLogin.mockClear()
    expect(await f.guest.capture()).toEqual(capture)
    expect(f.execute).toHaveBeenCalledExactlyOnceWith(`capture:${target}`)
    expect(f.load).not.toHaveBeenCalled()
    expect(f.readLogin).not.toHaveBeenCalled()
    expect(f.loginStore.read).not.toHaveBeenCalled()
    expect(f.loginStore.save).not.toHaveBeenCalled()
  })

  it('采集期间切换网页不认领旧快照，页面拒绝时保持明确原因', async () => {
    const f = fixture()
    await f.guest.newChat()
    const target = 'https://chat.deepseek.com/a/chat/s/discussion'
    const getURL = vi.spyOn(f.elements[0]!, 'getURL').mockReturnValue(target)
    const result = deferred<unknown>()
    f.execute.mockReturnValueOnce(result.promise)
    const pending = f.guest.capture()
    getURL.mockReturnValue('https://chat.deepseek.com/a/chat/s/other')
    result.resolve({ ok: false, reason: '页面返回较早结果' })
    await expect(pending).rejects.toThrow('网页已切换')
    f.execute.mockResolvedValue({ ok: false, reason: '尚未确认网页回答已结束' })
    await expect(f.guest.capture()).rejects.toThrow('尚未确认网页回答已结束')
  })

  it('重启时先恢复保存值并重载官网，空白登录页不会覆盖已有凭据', async () => {
    const f = fixture()
    f.loginStore.read.mockResolvedValue(savedLogin)
    await f.guest.newChat()
    expect(f.restoreLogin).toHaveBeenCalledOnce()
    expect(f.load).toHaveBeenNthCalledWith(1, HOME)
    expect(f.load).toHaveBeenNthCalledWith(2, HOME)
    expect(f.load.mock.invocationCallOrder[0]).toBeLessThan(f.restoreLogin.mock.invocationCallOrder[0]!)
    expect(f.restoreLogin.mock.invocationCallOrder[0]).toBeLessThan(f.load.mock.invocationCallOrder[1]!)
    expect(f.readLogin.mock.invocationCallOrder[0]).toBeGreaterThan(f.load.mock.invocationCallOrder[1]!)
    expect(f.loginStore.clear).not.toHaveBeenCalled()
    expect(f.loginStore.save).not.toHaveBeenCalled()
    expect(f.guest.getLoginMessage()).toContain('已记住网页登录')
  })

  it('登录后保存一次，只有明确退出才清除；加载和跨站导航不删除保存值', async () => {
    const f = fixture()
    await f.guest.newChat()
    expect(f.loginStore.save).toHaveBeenCalledExactlyOnceWith(savedLogin)
    f.readLogin.mockResolvedValue({ status: 'loading', state: null })
    await vi.advanceTimersByTimeAsync(1500)
    f.readLogin.mockResolvedValue({ status: 'wrong-origin', state: null })
    await vi.advanceTimersByTimeAsync(1500)
    expect(f.loginStore.clear).not.toHaveBeenCalled()
    f.readLogin.mockResolvedValue({ status: 'signed-out', state: null })
    await vi.advanceTimersByTimeAsync(3000)
    expect(f.loginStore.clear).toHaveBeenCalledOnce()
    expect(f.guest.getLoginMessage()).toContain('请在网页中登录')
  })

  it('官网语言变更会更新保存记录，相同偏好不重复写入', async () => {
    const f = fixture()
    f.loginStore.read.mockResolvedValue(savedLogin)
    await f.guest.newChat()
    const localized = { ...savedLogin, localePreference: '{"value":"zh_CN","__version":"0"}' }
    f.readLogin.mockResolvedValue({ status: 'authenticated', state: localized })
    await vi.advanceTimersByTimeAsync(1500)
    expect(f.loginStore.save).toHaveBeenCalledExactlyOnceWith(localized)
    await vi.advanceTimersByTimeAsync(3000)
    expect(f.loginStore.save).toHaveBeenCalledOnce()
  })

  it('已有新账号时不重载覆盖它，而是记住当前登录账号', async () => {
    const f = fixture()
    f.loginStore.read.mockResolvedValue({ ...savedLogin, deviceId: 'previous-device' })
    f.restoreLogin.mockResolvedValue({ status: 'existing-token' })
    await f.guest.newChat()
    expect(f.load).toHaveBeenCalledOnce()
    expect(f.loginStore.save).toHaveBeenCalledExactlyOnceWith(savedLogin)
    expect(f.loginStore.clear).not.toHaveBeenCalled()
  })

  it('读取凭据失败不会把新 guest 的空登录页当作注销清除原存储', async () => {
    const f = fixture()
    f.loginStore.read.mockRejectedValue(new Error('test credential failure'))
    f.readLogin.mockResolvedValue({ status: 'signed-out', state: null })
    await f.guest.newChat()
    await vi.advanceTimersByTimeAsync(1500)
    expect(f.loginStore.clear).not.toHaveBeenCalled()
    expect(f.guest.getLoginMessage()).toContain('无法读取已保存的登录')
  })

  it('首次导航失败释放租约，下次显式新建会重新初始化', async () => {
    const f = fixture()
    f.load.mockRejectedValueOnce(new Error('temporary network failure'))
    await expect(f.guest.newChat()).rejects.toThrow('temporary network failure')
    expect(f.release).toHaveBeenCalledExactlyOnceWith('lease-1')
    expect(f.unsubscribe).toHaveBeenCalledOnce()
    expect(f.container.querySelector('webview')).toBeNull()

    await f.guest.newChat()
    expect(f.acquire).toHaveBeenCalledTimes(2)
    expect(f.load).toHaveBeenCalledTimes(2)
    expect(f.container.querySelectorAll('webview')).toHaveLength(1)
    expect(f.elements[1]?.getAttribute('partition')).toBe('process-partition')
    expect(f.elements[1]?.getAttribute('src')).toBe('about:blank#lease-2')
  })

  it('首页导航在卸载后完成，不创建轮询或再次释放同一租约', async () => {
    const f = fixture()
    const loaded = deferred<void>()
    f.load.mockReturnValueOnce(loaded.promise)
    const task = f.guest.newChat().catch((error: unknown) => error)
    await vi.waitFor(() => expect(f.load).toHaveBeenCalledOnce())
    await f.guest.dispose()
    loaded.resolve()
    expect(await task).toEqual(new Error('Web Chat 插件已卸载。'))
    expect(f.release).toHaveBeenCalledExactlyOnceWith('lease-1')
    expect(f.container.querySelector('webview')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('卸载后才取得的租约立即释放，不挂载网页', async () => {
    const f = fixture()
    const acquired = deferred<{ lease: string; partition: string }>()
    f.acquire.mockReturnValueOnce(acquired.promise)
    const task = f.guest.newChat().catch((error: unknown) => error)
    await f.guest.dispose()
    acquired.resolve({ lease: 'late-lease', partition: 'process-partition' })
    expect(await task).toEqual(new Error('Web Chat 插件已卸载。'))
    expect(f.release).toHaveBeenCalledExactlyOnceWith('late-lease')
    expect(f.elements).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('页面探测之后、实际提交之前出现登录页，返回可继续的登录错误', async () => {
    const f = fixture()
    f.execute.mockImplementation(async script => script === 'probe' ? readyPage
      : { status: 'blocked', reason: 'login-required', snapshot: { ...readyPage, login: 'required' } })
    await expect(f.guest.send('问题', HOME)).rejects.toMatchObject({ code: 'login-required' })
    expect(f.execute.mock.calls.map(([script]) => script)).toEqual(['probe', 'send'])
  })

  it('已提交后进入登录页仍是不明结果，不返回可自动继续的登录错误', async () => {
    const f = fixture()
    f.execute.mockImplementation(async script => {
      if (script === 'probe') return readyPage
      if (script === 'send') return { status: 'dispatched', reason: null, snapshot: readyPage }
      return { status: 'pending', message: null, snapshot: { ...readyPage, login: 'required' } }
    })
    const task = f.guest.send('问题', HOME).catch((error: unknown) => error)
    await vi.waitFor(() => expect(f.execute).toHaveBeenCalledWith('receipt'))
    await vi.advanceTimersByTimeAsync(30000)
    const error = await task
    expect(error).toBeInstanceOf(Error)
    expect(error).not.toHaveProperty('code')
    expect((error as Error).message).toContain('不会自动重复发送')
    expect(f.execute.mock.calls.filter(([script]) => script === 'send')).toHaveLength(1)
  })

  it('已知草稿阻断原因转换为中文，不增加发送重试', async () => {
    const f = fixture()
    f.execute.mockImplementation(async script => script === 'probe' ? readyPage
      : { status: 'blocked', reason: 'draft-present', snapshot: readyPage })
    await expect(f.guest.send('问题', HOME)).rejects.toThrow('网页输入框中已有未发送的内容，请先处理该草稿。')
    expect(f.execute.mock.calls.map(([script]) => script)).toEqual(['probe', 'send'])
  })
})
