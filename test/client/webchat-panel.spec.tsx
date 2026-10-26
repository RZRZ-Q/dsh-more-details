// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import { WebChatPanel, WebChatLauncher, WebChatRestore, type WebChatPanelProps, type WebChatPreferences } from '../../src/client/webchat/WebChatPanel.js'
import type { WebChatState } from '../../src/client/webchat/controller.js'
import { DEFAULT_WEBCHAT_LAYOUT, type WebChatLayout } from '../../src/shared/webchat-layout.js'
import { localeFixture } from '../fixtures/locale.js'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

type Snapshot = Omit<ConfigFormSnapshot<WebChatPreferences>, 'mode'>
  & { readonly mode?: 'host' | 'memory' }

function fixture(initial: Partial<Snapshot> = {}, version: 'rc.2' | 'alpha.4' = 'rc.2', initialState: Partial<WebChatState> = {}, wide = true) {
  let state: WebChatState = { visible: true, hasOpened: true, busy: false, history: [], ...initialState }
  const listeners = new Set<() => void>()
  const visible = (value: boolean): void => {
    state = { ...state, visible: value }
    for (const listener of listeners) listener()
  }
  const controller = {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    hide: () => visible(false), show: vi.fn(() => visible(true)), newChat: vi.fn(), resume: vi.fn(), cancelPending: vi.fn(),
  } as unknown as WebChatPanelProps['controller']
  const webpage = document.createElement('webview')
  const attach = vi.fn((container: HTMLElement) => { container.append(webpage) })
  const loginMessage = { zh: '已记住网页登录，重启后自动恢复。', en: 'Web login remembered; it will be restored after restart.' }
  const guest = { attach, setAccessibleLabel: vi.fn((label: string) => webpage.setAttribute('aria-label', label)), subscribeLogin: () => () => {}, getLoginMessage: () => loginMessage } as unknown as WebChatPanelProps['guest']
  let preferences: Snapshot = {
    status: 'ready', value: { defaultPrompt: '解释选文', webChatLayout: DEFAULT_WEBCHAT_LAYOUT },
    writable: true, ...(version === 'rc.2' ? { mode: 'host' as const } : {}),
    base: undefined, user: undefined, revision: 1, ...initial,
  }
  const formListeners = new Set<() => void>()
  const publish = (update: Partial<Snapshot>): void => {
    preferences = { ...preferences, ...update }
    for (const listener of formListeners) listener()
  }
  const set = vi.fn(async (_field: string, value: WebChatLayout) => {
    publish({ value: { defaultPrompt: '解释选文', webChatLayout: value } })
    return true
  })
  const form = { getSnapshot: () => preferences, set,
    subscribe: (listener: () => void) => { formListeners.add(listener); return () => { formListeners.delete(listener) } },
  } as unknown as WebChatPanelProps['form']
  const { locale, setLanguage } = localeFixture('zh')
  const mount = () => {
    const result = render(<>
      <aside aria-label="Chat sidebar">
        <WebChatLauncher controller={controller} locale={locale} wide={wide} />
        <WebChatRestore controller={controller} locale={locale} wide={wide} />
      </aside>
      <WebChatPanel controller={controller} guest={guest} form={form} locale={locale} />
    </>)
    const panel = screen.getByRole('complementary', { name: 'DeepSeek Chat' })
    vi.spyOn(panel, 'getBoundingClientRect').mockImplementation(() => ({
      width: Number.parseFloat(panel.style.width), height: Number.parseFloat(panel.style.height),
    } as DOMRect))
    return { ...result, panel }
  }
  return { ...mount(), mount, webpage, attach, set, publish, form, setLanguage, controller }
}

function dragHandle(handle: Element, from: [number, number], to: [number, number], end = 'pointerup'): void {
  Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: vi.fn() })
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: from[0], clientY: from[1] })
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: to[0], clientY: to[1] })
  fireEvent(handle, new PointerEvent(end, { bubbles: true, pointerId: 1 }))
}

describe('网页小窗调整大小', () => {
  it.each(['rc.2', 'alpha.4'] as const)('%s 拖拽与方向键调整尺寸，放大还原和收起均保留同一个网页', async version => {
    const { panel, webpage, attach, set } = fixture({}, version)
    const handle = screen.getByRole('button', { name: '调整聊天窗口大小' })
    dragHandle(handle, [500, 100], [400, 80])
    expect(panel).toHaveStyle({ width: '620px', height: '670px' })
    expect(panel).not.toHaveAttribute('data-resizing')
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(panel).toHaveStyle({ width: '596px', height: '670px' })
    fireEvent.click(screen.getByRole('button', { name: '放大聊天窗口' }))
    expect(panel.style.width).toBe('var(--webchat-max-width)')
    expect(screen.queryByRole('button', { name: '调整聊天窗口大小' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '还原聊天窗口大小' }))
    expect(panel).toHaveStyle({ width: '596px', height: '670px' })
    fireEvent.click(screen.getByRole('button', { name: '收起 DeepSeek Chat' }))
    expect(panel).not.toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '继续聊天' }))
    expect(panel).toBeVisible()
    expect(panel).toHaveStyle({ width: '596px', height: '670px' })
    expect(attach).toHaveBeenCalledOnce()
    expect(panel.querySelector('webview')).toBe(webpage)
    expect(set.mock.calls.map(call => call[1])).toEqual([
      { width: 620, height: 670, expanded: false },
      { width: 596, height: 670, expanded: false },
      { width: 596, height: 670, expanded: true },
      { width: 596, height: 670, expanded: false },
    ])
    await waitFor(() => { expect(screen.queryByText('正在保存窗口大小…')).not.toBeInTheDocument() })
  })

  it.each([
    ['rc.2', { mode: 'memory' }, '无法读取或保存窗口大小'],
    ['rc.2', { writable: false }, '配置只读，无法保存窗口大小'],
    ['alpha.4', { writable: false }, '配置只读，无法保存窗口大小'],
    ['alpha.4', { status: 'loading', value: undefined }, '正在读取上次的窗口大小'],
    ['alpha.4', { status: 'unavailable', value: undefined }, '无法读取或保存窗口大小'],
  ] as const)('%s 无法持久写入 %j 时不允许缩放保存', (version, state, reason) => {
    const f = fixture(state, version)
    const handle = screen.getByRole('button', { name: '调整聊天窗口大小' })
    const expand = screen.getByRole('button', { name: '放大聊天窗口' })
    expect(handle).toBeDisabled()
    expect(expand).toBeDisabled()
    expect(screen.getByText(new RegExp(reason))).toBeInTheDocument()
    dragHandle(f.panel.querySelector('.dsh-webchat-resize-left')!, [500, 100], [400, 80])
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    fireEvent.click(expand)
    expect(f.panel).toHaveStyle({ width: '520px', height: '650px' })
    expect(f.set).not.toHaveBeenCalled()
  })

  it('边缘只改变对应方向，限制最小尺寸与视口边界，取消后停止拖动', async () => {
    const { panel } = fixture()
    dragHandle(panel.querySelector('.dsh-webchat-resize-left')!, [500, 100], [900, 500])
    expect(panel).toHaveStyle({ width: '360px', height: '650px' })
    dragHandle(panel.querySelector('.dsh-webchat-resize-top')!, [500, 100], [900, 500])
    expect(panel).toHaveStyle({ width: '360px', height: '360px' })
    const handle = screen.getByRole('button', { name: '调整聊天窗口大小' })
    dragHandle(handle, [500, 100], [-5000, -5000], 'pointercancel')
    expect(panel).toHaveStyle({ width: `${window.innerWidth - 40}px`, height: `${window.innerHeight - 64}px` })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 500, clientY: 100 })
    expect(panel).toHaveStyle({ width: `${window.innerWidth - 40}px`, height: `${window.innerHeight - 64}px` })
    expect(panel).not.toHaveAttribute('data-resizing')
    await waitFor(() => { expect(screen.queryByText('正在保存窗口大小…')).not.toBeInTheDocument() })
  })

  it.each(['rc.2', 'alpha.4'] as const)('%s 异步读取后恢复上次尺寸，不在读取前或挂载时写入默认值', async version => {
    const f = fixture({ status: 'loading', value: undefined }, version)
    expect(screen.getByRole('button', { name: '调整聊天窗口大小' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '放大聊天窗口' })).toBeDisabled()
    dragHandle(f.panel.querySelector('.dsh-webchat-resize-left')!, [500, 100], [400, 100])
    expect(f.set).not.toHaveBeenCalled()
    act(() => { f.publish({ status: 'ready', value: { defaultPrompt: '解释选文',
      webChatLayout: { width: 780, height: 610, expanded: false } } }) })
    expect(f.panel).toHaveStyle({ width: '780px', height: '610px' })
    expect(f.set).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole('button', { name: '调整聊天窗口大小' }), { key: 'ArrowLeft' })
    await waitFor(() => { expect(screen.queryByText('正在保存窗口大小…')).not.toBeInTheDocument() })
    f.unmount()
    expect(f.mount().panel).toHaveStyle({ width: '804px', height: '610px' })
    expect(f.set).toHaveBeenCalledExactlyOnceWith('webChatLayout', { width: 804, height: 610, expanded: false })
  })

  it('重挂载恢复放大状态，并保留放大前的自定义还原尺寸', async () => {
    const f = fixture()
    dragHandle(screen.getByRole('button', { name: '调整聊天窗口大小' }), [500, 100], [400, 80])
    fireEvent.click(screen.getByRole('button', { name: '放大聊天窗口' }))
    await waitFor(() => { expect(screen.queryByText('正在保存窗口大小…')).not.toBeInTheDocument() })
    f.unmount()
    const restored = f.mount()
    expect(restored.panel.style.width).toBe('var(--webchat-max-width)')
    fireEvent.click(screen.getByRole('button', { name: '还原聊天窗口大小' }))
    expect(restored.panel).toHaveStyle({ width: '620px', height: '670px' })
    await waitFor(() => { expect(screen.queryByText('正在保存窗口大小…')).not.toBeInTheDocument() })
    expect(f.set).toHaveBeenLastCalledWith('webChatLayout', { width: 620, height: 670, expanded: false })
  })

  it('只在拖拽结束保存一次，晚到的设置通知不覆盖正在调整的尺寸', async () => {
    const f = fixture()
    const handle = screen.getByRole('button', { name: '调整聊天窗口大小' })
    Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: vi.fn() })
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 500, clientY: 100 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 400, clientY: 80 })
    act(() => { f.publish({ value: { defaultPrompt: '新提示词', webChatLayout: DEFAULT_WEBCHAT_LAYOUT } }) })
    expect(f.panel).toHaveStyle({ width: '620px', height: '670px' })
    expect(f.set).not.toHaveBeenCalled()
    fireEvent.pointerUp(handle, { pointerId: 1 })
    fireEvent.lostPointerCapture(handle, { pointerId: 1 })
    expect(f.set).toHaveBeenCalledExactlyOnceWith('webChatLayout', { width: 620, height: 670, expanded: false })
    await waitFor(() => { expect(screen.queryByText('正在保存窗口大小…')).not.toBeInTheDocument() })
  })

  it.each(['pointerup', 'pointercancel'])('结束事件 %s 落在窗口或其他元素时仍保存并停止缩放', async eventName => {
    const f = fixture()
    const handle = screen.getByRole('button', { name: '调整聊天窗口大小' })
    Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: vi.fn() })
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 500, clientY: 100 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 400, clientY: 80 })
    fireEvent(eventName === 'pointerup' ? window : document.body, new PointerEvent(eventName, { bubbles: true, pointerId: 1 }))
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.lostPointerCapture(handle, { pointerId: 1 })
    expect(f.panel).toHaveStyle({ width: '620px', height: '670px' })
    expect(f.panel).not.toHaveAttribute('data-resizing')
    expect(f.set).toHaveBeenCalledExactlyOnceWith('webChatLayout', { width: 620, height: 670, expanded: false })
    await waitFor(() => { expect(screen.queryByText('正在保存窗口大小…')).not.toBeInTheDocument() })
  })

  it('拖动中卸载后清理窗口级监听，不再处理后续释放', () => {
    const f = fixture()
    const handle = screen.getByRole('button', { name: '调整聊天窗口大小' })
    Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: vi.fn() })
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 500, clientY: 100 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 400, clientY: 80 })
    f.unmount()
    fireEvent(window, new PointerEvent('pointerup', { pointerId: 1 }))
    expect(f.set).not.toHaveBeenCalled()
  })

  it('读取不可用和保存失败会明确提示，失败后仍可重新调整保存', async () => {
    const f = fixture({ status: 'unavailable', value: undefined })
    expect(screen.getByRole('alert')).toHaveTextContent('无法读取或保存窗口大小')
    expect(f.set).not.toHaveBeenCalled()
    act(() => { f.publish({ status: 'ready', value: { defaultPrompt: '解释选文', webChatLayout: DEFAULT_WEBCHAT_LAYOUT } }) })
    f.set.mockRejectedValueOnce(new Error('连接中断'))
    const handle = screen.getByRole('button', { name: '调整聊天窗口大小' })
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(await screen.findByRole('alert')).toHaveTextContent('窗口大小未保存：连接中断')
    f.set.mockResolvedValueOnce(false)
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    await waitFor(() => { expect(screen.getByRole('alert')).toHaveTextContent('窗口大小未保存：配置可能已变化') })
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    await waitFor(() => { expect(screen.queryByRole('alert')).not.toBeInTheDocument(); expect(screen.queryByText('正在保存窗口大小…')).not.toBeInTheDocument() })
  })
})

describe('侧栏继续网页聊天', () => {
  it.each([true, false])('宽侧栏=%s：从历史或设置收起后恢复同一网页，不新建或继续待发送请求', wide => {
    const url = 'https://chat.deepseek.com/a/chat/s/test-conversation'
    const f = fixture({}, 'rc.2', { currentUrl: url, pending: {
      kind: 'prompt', prompt: '尚未确认的请求', sourceSessionId: 'parent', reason: 'unconfirmed',
    } }, wide)
    const draft = document.createElement('textarea')
    draft.value = '尚未发送的网页草稿'
    f.webpage.append(draft)
    const sidebar = screen.getByRole('complementary', { name: 'Chat sidebar' })
    for (const view of ['历史', '提示词']) {
      fireEvent.click(screen.getByRole('button', { name: view }))
      expect(f.webpage).not.toBeVisible()
      fireEvent.click(screen.getByRole('button', { name: '收起 DeepSeek Chat' }))
      const restore = within(sidebar).getByRole('button', { name: '继续聊天' })
      expect(within(sidebar).getByRole('button', { name: '新建 Chat' })).toBeInTheDocument()
      expect(document.querySelector('.dsh-webchat-restore')).toBeNull()
      fireEvent.click(restore)
      expect(f.webpage).toBeVisible()
      expect(f.panel.querySelector('webview')).toBe(f.webpage)
      expect(draft.value).toBe('尚未发送的网页草稿')
      expect(f.controller.getSnapshot().currentUrl).toBe(url)
      expect(f.controller.getSnapshot().pending?.reason).toBe('unconfirmed')
      expect(within(sidebar).queryByRole('button', { name: '继续聊天' })).toBeNull()
    }
    expect(f.controller.show).toHaveBeenCalledTimes(2)
    expect(f.controller.newChat).not.toHaveBeenCalled()
    expect(f.controller.resume).not.toHaveBeenCalled()
    expect(f.attach).toHaveBeenCalledOnce()
  })

  it('未打开过网页时不显示继续入口，收起后的入口跟随语言', () => {
    const f = fixture({}, 'rc.2', { hasOpened: false })
    fireEvent.click(screen.getByRole('button', { name: '收起 DeepSeek Chat' }))
    expect(screen.queryByRole('button', { name: '继续聊天' })).toBeNull()
    expect(f.controller.show).not.toHaveBeenCalled()
    expect(f.controller.newChat).not.toHaveBeenCalled()
    f.unmount()
    const opened = fixture()
    fireEvent.click(screen.getByRole('button', { name: '收起 DeepSeek Chat' }))
    expect(screen.getByRole('button', { name: '继续聊天' })).toHaveAttribute('title', '继续当前 DeepSeek 网页聊天')
    act(() => opened.setLanguage('en'))
    expect(screen.getByRole('button', { name: 'Continue chat' })).toHaveAttribute('title', 'Continue the current DeepSeek web chat')
    expect(screen.getByRole('button', { name: 'New Chat' })).toBeInTheDocument()
    expect(opened.controller.show).not.toHaveBeenCalled()
    expect(opened.controller.newChat).not.toHaveBeenCalled()
  })
})


describe('网页小窗跟随 DSH 语言', () => {
  it.each(['rc.2', 'alpha.4'] as const)('%s 实时切换按钮、登录和待办状态，保留网页、草稿、历史与尺寸', version => {
    const f = fixture({}, version, {
      message: { zh: '请先在网页中登录。', en: 'Sign in on the website first.' },
      pending: { kind: 'new-chat', reason: 'login-required' },
      history: [{ url: 'https://chat.deepseek.com/a/chat/s/one', title: '原始中文标题', sourceSessionId: null, updatedAt: 1_700_000_000_000 }],
    })
    fireEvent.click(screen.getByRole('button', { name: '提示词' }))
    fireEvent.change(screen.getByRole('textbox', { name: '默认提示词' }), { target: { value: '尚未保存的中文 prompt' } })
    act(() => f.setLanguage('en'))
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue after signing in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel pending action' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to DSH' })).toBeDisabled()
    expect(screen.getByText('Sign in on the website first.')).toBeInTheDocument()
    expect(screen.getByText('Web login remembered; it will be restored after restart.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Default prompt' })).toHaveValue('尚未保存的中文 prompt')
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    expect(screen.getByRole('heading', { name: 'Recently opened chats' })).toBeInTheDocument()
    expect(screen.getByText('原始中文标题')).toBeInTheDocument()
    expect(f.panel.querySelector('webview')).toBe(f.webpage)
    expect(f.webpage).toHaveAttribute('aria-label', 'DeepSeek web chat')
    expect(f.panel).toHaveStyle({ width: '520px', height: '650px' })
    expect(f.attach).toHaveBeenCalledOnce()
    expect(f.set).not.toHaveBeenCalled()
    expect(f.controller.newChat).not.toHaveBeenCalled()
    expect(f.controller.resume).not.toHaveBeenCalled()
    act(() => f.setLanguage('zh'))
    expect(screen.getByRole('button', { name: '新建' })).toBeInTheDocument()
    expect(screen.getByText('已记住网页登录，重启后自动恢复。')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '提示词' }))
    expect(screen.getByRole('textbox', { name: '默认提示词' })).toHaveValue('尚未保存的中文 prompt')
  })

  it('保存失败后切换语言，错误前缀更新而原始诊断保留', async () => {
    const f = fixture()
    f.set.mockRejectedValueOnce(new Error('network disconnected'))
    fireEvent.keyDown(screen.getByRole('button', { name: '调整聊天窗口大小' }), { key: 'ArrowLeft' })
    expect(await screen.findByRole('alert')).toHaveTextContent('窗口大小未保存：network disconnected')
    act(() => f.setLanguage('en'))
    expect(screen.getByRole('alert')).toHaveTextContent('Window size was not saved: network disconnected')
    expect(f.set).toHaveBeenCalledOnce()
  })

  it('侧栏入口随语言更新，只有点击时新建聊天', () => {
    const { locale, setLanguage } = localeFixture('zh')
    const controller = { newChat: vi.fn(async () => {}) }
    render(<WebChatLauncher locale={locale} controller={controller} wide />)
    expect(screen.getByRole('button', { name: '新建 Chat' })).toHaveAttribute('title', '新建 DeepSeek 网页聊天')
    act(() => setLanguage('en'))
    expect(screen.getByRole('button', { name: 'New Chat' })).toHaveAttribute('title', 'New DeepSeek web chat')
    expect(controller.newChat).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'New Chat' }))
    expect(controller.newChat).toHaveBeenCalledOnce()
  })
})
