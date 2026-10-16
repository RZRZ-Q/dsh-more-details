import { describe, expect, it, vi } from 'vitest'
import type { AttachmentId } from '@deepseek-ai/dsh-attachment'
import type { PrepareDetails } from '../../src/client/dsh/more-details-controller.js'
import { WebChatController, WEBCHAT_HISTORY_STORAGE_KEY, type WebChatPage, type WebChatPort, type SaveWebChatReference } from '../../src/client/webchat/controller.js'
import { SessionId, type ConversationSelection } from '../../src/shared/contracts.js'
import type { WebChatCapture, WebChatReference } from '../../src/shared/webchat-reference.js'
import { deferred } from '../fixtures/client-runtime.js'
import { localeFixture } from '../fixtures/locale.js'
import { renderWebChatMessage, WebChatMessageError } from '../../src/client/webchat/messages.js'

const selection: ConversationSelection = {
  parentSessionId: SessionId('parent-1'), text: 'Selected passage', atSeq: 7, fragments: [],
  rect: { x: 0, y: 0, width: 10, height: 10, viewportWidth: 800, viewportHeight: 600 },
}
const firstUrl = 'https://chat.deepseek.com/a/chat/s/first-chat'
const otherUrl = 'https://chat.deepseek.com/a/other-agent/s/second-chat'
const promptText = 'Frozen prompt with selected text and context'
const loginRequired = Object.assign(new Error('Login required'), { code: 'login-required', submitted: false })
const captured: WebChatCapture = {
  version: 1, url: firstUrl, title: '数值讨论', capturedAt: '2026-10-15T10:00:00.000Z',
  scope: 'rendered-current-branch', completeness: 'partial',
  messages: [{ id: 'u1', role: 'user', content: '差值是多少？' }, { id: 'a1', role: 'assistant', content: '3.24' }],
}
const referenceId = `sha256:${'a'.repeat(64)}`
const reference: WebChatReference = { ...captured, referenceId, conversationId: 'first-chat',
  preview: captured.messages, messageCount: 2,
  attachment: { attachmentId: referenceId as AttachmentId, name: 'webchat-first-chat.json', bytes: 200 } }

function fixture(initialHistory?: string) {
  const values = new Map<string, string>()
  if (initialHistory !== undefined) values.set(WEBCHAT_HISTORY_STORAGE_KEY, initialHistory)
  const storage = { getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value) }) }
  let controller: WebChatController
  const newChat = vi.fn<WebChatPort['newChat']>().mockImplementation(async () => {
    controller.observePage({ url: 'https://chat.deepseek.com/', title: 'DeepSeek' })
  })
  const open = vi.fn<WebChatPort['open']>().mockImplementation(async url => {
    controller.observePage({ url, title: 'Reopened chat' })
  })
  const send = vi.fn<WebChatPort['send']>().mockResolvedValue({ url: firstUrl, title: 'First chat' })
  const release = vi.fn()
  const source = { selectionIsCurrent: vi.fn(() => true), retainParent: vi.fn(() => release),
    currentSessionId: vi.fn<() => SessionId | undefined>(() => selection.parentSessionId),
    title: vi.fn(() => '来源任务'), subscribeList: vi.fn((_listener: () => void) => () => {}),
    addWebChatToConversation: vi.fn(() => true), focusConversationInput: vi.fn(), notify: vi.fn() }
  const prepare = vi.fn<PrepareDetails>().mockResolvedValue({ ok: true, value: { prompt: promptText } })
  const saveReference = vi.fn<SaveWebChatReference>().mockResolvedValue({ ok: true, value: { reference } })
  const port = { newChat, open, send, capture: vi.fn<WebChatPort['capture']>().mockResolvedValue(captured) }
  const language = localeFixture('zh')
  const text = (zh: string, en: string): string => language.locale.resolveText({ zh, en })
  controller = new WebChatController(port, prepare, source, storage, saveReference, text)
  return { controller, port, prepare, source, release, storage, values, saveReference, language, text }
}

describe('DeepSeek 网页更多详情控制器', () => {
  it('准备和存档的 Host 自有错误按语言显示，外部原因仍原样保留', async () => {
    const f = fixture()
    f.prepare.mockResolvedValueOnce({ ok: false, error: { code: 'context_unavailable',
      message: 'The selected source message is no longer available. Select the text again.', recoverable: false } })
    await f.controller.start(selection)
    expect(renderWebChatMessage(f.controller.getSnapshot().message!, f.text)).toBe('选文所属消息已不可用，请重新选择文字。')
    f.language.setLanguage('en')
    expect(renderWebChatMessage(f.controller.getSnapshot().message!, f.text)).toBe('The selected source message is no longer available. Select the text again.')
    expect(f.port.send).not.toHaveBeenCalled()
    f.controller.observePage({ url: firstUrl, title: '数值讨论' })
    f.saveReference.mockResolvedValueOnce({ ok: false, error: { code: 'context_unavailable',
      message: '无法保存网页讨论引用：网页讨论快照超过 8 MiB，请缩小采集范围后重试。', recoverable: true } })
    await f.controller.addToDsh()
    expect(renderWebChatMessage(f.controller.getSnapshot().message!, f.text)).toBe('Could not save the Web Chat reference: The Web Chat snapshot exceeds 8 MiB. Capture a smaller range and try again.')
    f.language.setLanguage('zh')
    expect(renderWebChatMessage(f.controller.getSnapshot().message!, f.text)).toContain('网页讨论快照超过 8 MiB')
    f.saveReference.mockResolvedValueOnce({ ok: false, error: { code: 'context_unavailable',
      message: '无法保存网页讨论引用：ENOSPC', recoverable: true } })
    await f.controller.addToDsh()
    f.language.setLanguage('en')
    expect(renderWebChatMessage(f.controller.getSnapshot().message!, f.text)).toBe('Could not save the Web Chat reference: ENOSPC')
    expect(f.source.addWebChatToConversation).not.toHaveBeenCalled()
  })

  it('忙碌、登录待办和失败提示按当前语言渲染，切换语言不改变意图或重发', async () => {
    const f = fixture()
    let rejectSend!: (error: unknown) => void
    f.port.send.mockReturnValueOnce(new Promise<WebChatPage>((_resolve, reject) => { rejectSend = reject }))
    const task = f.controller.start(selection)
    await vi.waitFor(() => expect(f.port.send).toHaveBeenCalledOnce())
    const busy = f.controller.getSnapshot().message!
    expect(renderWebChatMessage(busy, f.text)).toBe('正在发送更多详情…')
    f.language.setLanguage('en')
    expect(renderWebChatMessage(busy, f.text)).toBe('Sending More details…')
    expect(f.controller.getSnapshot().message).toBe(busy)
    rejectSend(new WebChatMessageError({ zh: '网页输入框中已有未发送的内容，请先处理该草稿。',
      en: 'The webpage composer contains an unsent draft. Handle that draft first.' }))
    await task
    const failed = f.controller.getSnapshot()
    expect(renderWebChatMessage(failed.message!, f.text)).toContain('Sending is unconfirmed')
    expect(renderWebChatMessage(failed.message!, f.text)).toContain('unsent draft')
    f.language.setLanguage('zh')
    expect(renderWebChatMessage(failed.message!, f.text)).toContain('发送结果未确认')
    expect(f.controller.getSnapshot().pending).toBe(failed.pending)
    expect(f.port.newChat).toHaveBeenCalledOnce()
    expect(f.port.send).toHaveBeenCalledExactlyOnceWith(promptText, undefined)
    f.controller.cancelPending()
    f.port.newChat.mockRejectedValueOnce(loginRequired)
    await f.controller.start(selection)
    const pending = f.controller.getSnapshot().pending
    expect(renderWebChatMessage(f.controller.getSnapshot().message!, f.text)).toContain('登录后继续')
    f.language.setLanguage('en')
    expect(renderWebChatMessage(f.controller.getSnapshot().message!, f.text)).toContain('Continue after signing in')
    expect(f.controller.getSnapshot().pending).toBe(pending)
    expect(f.port.send).toHaveBeenCalledOnce()
  })

  it('添加引用的完成通知使用完成时的语言，不改正文或草稿动作', async () => {
    const f = fixture()
    f.controller.observePage({ url: firstUrl, title: '数值讨论' })
    const saving = deferred<Awaited<ReturnType<SaveWebChatReference>>>()
    f.saveReference.mockReturnValueOnce(saving.promise)
    const task = f.controller.addToDsh()
    await vi.waitFor(() => expect(f.saveReference).toHaveBeenCalledOnce())
    f.language.setLanguage('en')
    saving.resolve({ ok: true, value: { reference } })
    await task
    expect(f.source.notify).toHaveBeenCalledExactlyOnceWith({ kind: 'status',
      text: 'The Web Chat reference was added to your draft. Add any instructions before sending.' })
    expect(f.source.addWebChatToConversation).toHaveBeenCalledExactlyOnceWith(selection.parentSessionId, reference)
    expect(f.port.send).not.toHaveBeenCalled()
  })

  it('添加到 DSH 先保存正文再插入草稿，收起小窗但不发送或导航', async () => {
    const f = fixture()
    f.controller.show()
    f.controller.observePage({ url: firstUrl, title: '数值讨论' })
    await f.controller.addToDsh()
    expect(f.saveReference).toHaveBeenCalledExactlyOnceWith({ sessionId: selection.parentSessionId, capture: captured })
    expect(f.source.addWebChatToConversation).toHaveBeenCalledExactlyOnceWith(selection.parentSessionId, reference)
    expect(f.source.focusConversationInput).toHaveBeenCalledExactlyOnceWith(selection.parentSessionId)
    expect(f.controller.getSnapshot()).toMatchObject({ busy: false, visible: false, currentUrl: firstUrl })
    expect(f.port.send).not.toHaveBeenCalled()
    expect(f.port.open).not.toHaveBeenCalled()
    expect(f.port.newChat).not.toHaveBeenCalled()
  })

  it('保存期间切换主会话不向新旧输入框误投引用', async () => {
    const f = fixture()
    f.controller.observePage({ url: firstUrl, title: '数值讨论' })
    const gate = deferred<Awaited<ReturnType<SaveWebChatReference>>>()
    f.saveReference.mockReturnValue(gate.promise)
    const adding = f.controller.addToDsh()
    await vi.waitFor(() => expect(f.saveReference).toHaveBeenCalledOnce())
    f.source.currentSessionId.mockReturnValue(SessionId('another-task'))
    gate.resolve({ ok: true, value: { reference } })
    await adding
    expect(f.source.addWebChatToConversation).not.toHaveBeenCalled()
    expect(renderWebChatMessage(f.controller.getSnapshot().message!, f.text)).toContain('主会话已切换')
  })

  it('采集期间网页切换时不保存错引用，失败时保留小窗和草稿', async () => {
    const f = fixture()
    f.controller.show()
    f.controller.observePage({ url: firstUrl, title: '数值讨论' })
    f.port.capture.mockResolvedValue({ ...captured, url: otherUrl })
    await f.controller.addToDsh()
    expect(f.saveReference).not.toHaveBeenCalled()
    expect(f.source.addWebChatToConversation).not.toHaveBeenCalled()
    expect(f.controller.getSnapshot()).toMatchObject({ busy: false, visible: true, message: expect.objectContaining({ zh: expect.stringContaining('网页聊天已切换') }) })
  })

  it('采集未完成或存档失败不插入卡片', async () => {
    const f = fixture()
    f.controller.observePage({ url: firstUrl, title: '数值讨论' })
    f.port.capture.mockRejectedValueOnce(new Error('请等待网页回答完成。'))
    await f.controller.addToDsh()
    expect(f.saveReference).not.toHaveBeenCalled()
    f.saveReference.mockResolvedValueOnce({ ok: false, error: { code: 'internal_error', message: '保存失败', recoverable: true } })
    await f.controller.addToDsh()
    expect(f.source.addWebChatToConversation).not.toHaveBeenCalled()
    expect(f.controller.getSnapshot().message).toBe('保存失败')
  })

  it('重复点击只采集一次，卸载后返回的快照不会写入草稿', async () => {
    const f = fixture()
    f.controller.observePage({ url: firstUrl, title: '数值讨论' })
    const gate = deferred<WebChatCapture>()
    f.port.capture.mockReturnValue(gate.promise)
    const adding = f.controller.addToDsh()
    await f.controller.addToDsh()
    f.controller.dispose()
    gate.resolve(captured)
    await adding
    expect(f.port.capture).toHaveBeenCalledOnce()
    expect(f.saveReference).not.toHaveBeenCalled()
    expect(f.source.addWebChatToConversation).not.toHaveBeenCalled()
  })

  it('显式新建只打开空白页，隐藏与重开保留网页挂载状态', async () => {
    const f = fixture()
    expect(f.controller.getSnapshot()).toMatchObject({ visible: false, hasOpened: false })
    await f.controller.newChat()
    expect(f.port.newChat).toHaveBeenCalledOnce()
    expect(f.port.send).not.toHaveBeenCalled()
    f.controller.hide()
    expect(f.controller.getSnapshot()).toMatchObject({ visible: false, hasOpened: true, busy: false })
    f.controller.show()
    expect(f.controller.getSnapshot().visible).toBe(true)
    expect(f.port.newChat).toHaveBeenCalledOnce()
  })

  it('冻结 prepare 返回内容发送，并只持久化去查询参数的会话元数据', async () => {
    const f = fixture()
    f.port.send.mockResolvedValue({ url: `${firstUrl}?token=private#content`, title: 'First chat' })
    await f.controller.start(selection)
    expect(f.prepare).toHaveBeenCalledExactlyOnceWith({ parentSessionId: selection.parentSessionId, atSeq: 7, selectedText: selection.text })
    expect(f.source.retainParent).toHaveBeenCalledExactlyOnceWith(selection.parentSessionId)
    expect(f.release).toHaveBeenCalledOnce()
    expect(f.port.newChat).toHaveBeenCalledOnce()
    expect(f.port.send).toHaveBeenCalledExactlyOnceWith(promptText, undefined)
    expect(f.controller.getSnapshot()).toMatchObject({ visible: true, busy: false, currentUrl: firstUrl, pending: undefined })
    const history = JSON.parse(f.values.get(WEBCHAT_HISTORY_STORAGE_KEY)!)
    expect(history).toEqual([{ url: firstUrl, title: 'First chat', sourceSessionId: 'parent-1', updatedAt: expect.any(Number) }])
    expect(f.values.get(WEBCHAT_HISTORY_STORAGE_KEY)).not.toContain(promptText)
    expect(f.values.get(WEBCHAT_HISTORY_STORAGE_KEY)).not.toContain('private')
  })

  it('同一活动来源且真实 URL 一致时续聊，隐藏不破坏关联', async () => {
    const f = fixture()
    await f.controller.start(selection)
    f.controller.hide()
    await f.controller.start(selection)
    expect(f.port.newChat).toHaveBeenCalledOnce()
    expect(f.port.send).toHaveBeenLastCalledWith(promptText, firstUrl)
    expect(f.controller.getSnapshot().history).toHaveLength(1)
    f.port.send.mockResolvedValue({ url: otherUrl, title: 'Other source' })
    await f.controller.start({ ...selection, parentSessionId: SessionId('parent-2') })
    expect(f.port.newChat).toHaveBeenCalledTimes(2)
    expect(f.port.send).toHaveBeenLastCalledWith(promptText, undefined)
  })

  it('网页手动切换再切回也不恢复来源绑定', async () => {
    const f = fixture()
    await f.controller.start(selection)
    f.controller.observePage({ url: otherUrl, title: 'Other chat' })
    f.controller.observePage({ url: firstUrl, title: 'First chat' })
    await f.controller.start(selection)
    expect(f.port.newChat).toHaveBeenCalledTimes(2)
  })

  it('显式新建清除旧 URL 和来源关联，不把空白页当作上一场聊天', async () => {
    const f = fixture()
    await f.controller.start(selection)
    await f.controller.newChat()
    expect(f.controller.getSnapshot().currentUrl).toBeUndefined()
    expect(f.port.send).toHaveBeenCalledOnce()
    await f.controller.start(selection)
    expect(f.port.newChat).toHaveBeenCalledTimes(3)
    expect(f.port.send).toHaveBeenLastCalledWith(promptText, undefined)
  })

  it('历史重开只导航并清除来源关联，重启后也不从历史元数据恢复绑定', async () => {
    const f = fixture()
    await f.controller.start(selection)
    await f.controller.openHistory(firstUrl)
    expect(f.port.open).toHaveBeenCalledExactlyOnceWith(firstUrl)
    expect(f.port.send).toHaveBeenCalledOnce()
    await f.controller.start(selection)
    expect(f.port.newChat).toHaveBeenCalledTimes(2)
    const reloaded = new WebChatController(f.port, f.prepare, f.source, f.storage, f.saveReference)
    expect(reloaded.getSnapshot().history).toHaveLength(1)
    reloaded.observePage({ url: firstUrl, title: 'First chat' })
    await reloaded.start(selection)
    expect(f.port.newChat).toHaveBeenCalledTimes(3)
  })

  it('登录后继续空白新建意图不会产生消息', async () => {
    const f = fixture()
    f.port.newChat.mockRejectedValueOnce(loginRequired)
    await f.controller.newChat()
    expect(f.controller.getSnapshot().pending).toEqual({ kind: 'new-chat', reason: 'login-required' })
    await f.controller.resume()
    expect(f.port.newChat).toHaveBeenCalledTimes(2)
    expect(f.port.send).not.toHaveBeenCalled()
    expect(f.controller.getSnapshot().pending).toBeUndefined()
  })

  it('成功重开历史后更新最近访问时间和排序，不把来源记录当成活动绑定', async () => {
    const f = fixture(JSON.stringify([
      { url: firstUrl, title: 'First chat', sourceSessionId: 'parent-1', updatedAt: 1 },
      { url: otherUrl, title: 'Other chat', sourceSessionId: null, updatedAt: 2 },
    ]))
    expect(f.controller.getSnapshot().history[0]?.url).toBe(otherUrl)
    await f.controller.openHistory(firstUrl)
    expect(f.controller.getSnapshot().history[0]).toMatchObject({ url: firstUrl, sourceSessionId: 'parent-1' })
    expect(f.controller.getSnapshot().history[0]!.updatedAt).toBeGreaterThan(2)
    expect(f.port.send).not.toHaveBeenCalled()
    await f.controller.start(selection)
    expect(f.port.newChat).toHaveBeenCalledOnce()
  })

  it('历史导航遇到登录后保留目标，继续仅重开该 URL', async () => {
    const f = fixture()
    f.port.open.mockRejectedValueOnce(loginRequired)
    await f.controller.openHistory(otherUrl)
    expect(f.controller.getSnapshot().pending).toEqual({ kind: 'open-chat', url: otherUrl, reason: 'login-required' })
    await f.controller.resume()
    expect(f.port.open).toHaveBeenNthCalledWith(2, otherUrl)
    expect(f.port.newChat).not.toHaveBeenCalled()
    expect(f.port.send).not.toHaveBeenCalled()
  })

  it.each(['navigation', 'send'] as const)('%s 缺登录时保留冻结 prompt，只有显式继续才发送', async stage => {
    const f = fixture()
    if (stage === 'navigation') f.port.newChat.mockRejectedValueOnce(loginRequired)
    else f.port.send.mockRejectedValueOnce(loginRequired)
    await f.controller.start(selection)
    expect(f.controller.getSnapshot().pending).toEqual({ kind: 'prompt', prompt: promptText, sourceSessionId: 'parent-1', reason: 'login-required' })
    const calls = f.port.send.mock.calls.length
    f.controller.observePage({ url: 'https://chat.deepseek.com/', title: 'Logged in' })
    await f.controller.start(selection)
    expect(f.port.send).toHaveBeenCalledTimes(calls)
    f.prepare.mockResolvedValue({ ok: true, value: { prompt: 'A new setting must not replace the pending prompt' } })
    await f.controller.resume()
    expect(f.prepare).toHaveBeenCalledOnce()
    expect(f.port.send).toHaveBeenLastCalledWith(promptText, undefined)
    expect(f.controller.getSnapshot().pending).toBeUndefined()
  })

  it('续聊登录后先恢复原目标网页，再带 expectedUrl 提交冻结内容', async () => {
    const f = fixture()
    await f.controller.start(selection)
    f.port.send.mockRejectedValueOnce(loginRequired)
    await f.controller.start(selection)
    f.controller.observePage({ url: 'https://chat.deepseek.com/', title: 'Login' })
    await f.controller.resume()
    expect(f.port.open).toHaveBeenCalledExactlyOnceWith(firstUrl)
    expect(f.port.send).toHaveBeenLastCalledWith(promptText, firstUrl)
  })

  it.each([
    new Error('Connection lost after submit'),
    Object.assign(new Error('Login after submit'), { code: 'login-required', submitted: true }),
  ])('无法确认发送时阻止 start 和 resume 自动重发', async error => {
    const f = fixture()
    f.port.send.mockRejectedValue(error)
    await f.controller.start(selection)
    expect(f.controller.getSnapshot()).toMatchObject({ busy: false, pending: { reason: 'unconfirmed' } })
    await f.controller.resume()
    await f.controller.start(selection)
    expect(f.port.send).toHaveBeenCalledOnce()
    f.controller.cancelPending()
    expect(f.controller.getSnapshot().pending).toBeUndefined()
  })

  it('未收到合法的真实会话 URL 也不能自动重发', async () => {
    const f = fixture()
    f.port.send.mockResolvedValue({ url: 'https://chat.deepseek.com/', title: 'Not confirmed' })
    await f.controller.start(selection)
    expect(f.controller.getSnapshot()).toMatchObject({ pending: { reason: 'unconfirmed' }, history: [] })
    await f.controller.resume()
    expect(f.port.send).toHaveBeenCalledOnce()
  })

  it('新聊天发送产生真实 URL 属于预期导航，之后可以续聊', async () => {
    const f = fixture()
    f.port.send.mockImplementation(async () => {
      f.controller.observePage({ url: firstUrl, title: 'First chat' })
      return { url: firstUrl, title: 'First chat' }
    })
    await f.controller.start(selection)
    await f.controller.start(selection)
    expect(f.port.newChat).toHaveBeenCalledOnce()
    expect(f.port.send).toHaveBeenLastCalledWith(promptText, firstUrl)
  })

  it('发送过程中切到别的 URL 不会被晚到成功结果重新绑回来源', async () => {
    const f = fixture()
    const sent = deferred<WebChatPage>()
    f.port.send.mockReturnValueOnce(sent.promise)
    const task = f.controller.start(selection)
    await vi.waitFor(() => expect(f.port.send).toHaveBeenCalledOnce())
    f.controller.observePage({ url: firstUrl, title: 'First chat' })
    f.controller.observePage({ url: otherUrl, title: 'Manually navigated' })
    sent.resolve({ url: firstUrl, title: 'First chat' })
    await task
    expect(f.controller.getSnapshot()).toMatchObject({ currentUrl: otherUrl, message: expect.objectContaining({ zh: expect.stringContaining('网页已切换') }) })
    await f.controller.start(selection)
    expect(f.port.newChat).toHaveBeenCalledTimes(2)
  })

  it('准备期间重复点击合并，选区随后失效则不导航或发送', async () => {
    const f = fixture()
    const prepared = deferred<Awaited<ReturnType<PrepareDetails>>>()
    f.prepare.mockReturnValue(prepared.promise)
    const task = f.controller.start(selection)
    await f.controller.start(selection)
    f.source.selectionIsCurrent.mockReturnValue(false)
    prepared.resolve({ ok: true, value: { prompt: promptText } })
    await task
    expect(f.prepare).toHaveBeenCalledOnce()
    expect(f.release).toHaveBeenCalledOnce()
    expect(f.port.newChat).not.toHaveBeenCalled()
    expect(f.port.send).not.toHaveBeenCalled()
    expect(renderWebChatMessage(f.controller.getSnapshot().message!, f.text)).toContain('选文已变化')
  })

  it('已失效的选区和 prepare 失败都不会打开网页', async () => {
    const f = fixture()
    f.source.selectionIsCurrent.mockReturnValueOnce(false)
    await f.controller.start(selection)
    expect(f.prepare).not.toHaveBeenCalled()
    f.prepare.mockRejectedValueOnce(new Error('Preparation failed'))
    await f.controller.start(selection)
    expect(f.port.newChat).not.toHaveBeenCalled()
    expect(f.controller.getSnapshot().message).toBe('Preparation failed')
    expect(f.release).toHaveBeenCalledOnce()
  })

  it('历史只记录合法网页会话，重复探针不反复写入，标题变化会更新', () => {
    const f = fixture()
    f.controller.observePage({ url: `${firstUrl}?private=1#selection`, title: 'First chat' })
    f.controller.observePage({ url: firstUrl, title: 'First chat' })
    expect(f.storage.setItem).toHaveBeenCalledOnce()
    f.controller.observePage({ url: firstUrl, title: 'Renamed' })
    expect(f.storage.setItem).toHaveBeenCalledTimes(2)
    expect(f.controller.getSnapshot().history[0]).toMatchObject({ title: 'Renamed', sourceSessionId: null })
    f.controller.observePage({ url: 'https://example.com/private', title: 'External' })
    expect(f.controller.getSnapshot().currentUrl).toBeUndefined()
    expect(f.controller.getSnapshot().history).toHaveLength(1)
  })

  it.each(['not json', JSON.stringify([{ url: 'https://user:secret@chat.deepseek.com/a/chat/s/id', title: 'Unsafe', sourceSessionId: null, updatedAt: 1 }])])('历史损坏或含凭据 URL 时不导航并显示读取错误', history => {
    const f = fixture(history)
    expect(f.controller.getSnapshot().history).toEqual([])
    expect(renderWebChatMessage(f.controller.getSnapshot().message!, f.text)).toContain('无法读取')
    expect(f.port.open).not.toHaveBeenCalled()
  })

  it('历史存储失败不把已确认发送标为可重发', async () => {
    const f = fixture()
    f.storage.setItem.mockImplementation(() => { throw new Error('Storage full') })
    await f.controller.start(selection)
    expect(f.controller.getSnapshot()).toMatchObject({ busy: false, pending: undefined, currentUrl: firstUrl,
      message: expect.objectContaining({ zh: expect.stringContaining('无法保存本地历史') }) })
    await f.controller.resume()
    expect(f.port.send).toHaveBeenCalledOnce()
  })

  it('隐藏进行中的面板后，成功结果不会重新打开面板', async () => {
    const f = fixture()
    const sent = deferred<WebChatPage>()
    f.port.send.mockReturnValue(sent.promise)
    const task = f.controller.start(selection)
    await vi.waitFor(() => expect(f.port.send).toHaveBeenCalledOnce())
    f.controller.hide()
    sent.resolve({ url: firstUrl, title: 'First chat' })
    await task
    expect(f.controller.getSnapshot()).toMatchObject({ visible: false, hasOpened: true, busy: false, currentUrl: firstUrl })
  })

  it.each(['prepare', 'navigation', 'send'] as const)('%s 的异步结果在卸载后返回时不再触发动作或历史写入', async stage => {
    const f = fixture()
    const gate = deferred<void>()
    if (stage === 'prepare') f.prepare.mockImplementation(async () => {
      await gate.promise
      return { ok: true, value: { prompt: promptText } }
    })
    if (stage === 'navigation') f.port.newChat.mockReturnValue(gate.promise)
    if (stage === 'send') f.port.send.mockImplementation(async () => {
      await gate.promise
      return { url: firstUrl, title: 'First chat' }
    })
    const task = f.controller.start(selection)
    if (stage === 'navigation') await vi.waitFor(() => expect(f.port.newChat).toHaveBeenCalledOnce())
    if (stage === 'send') await vi.waitFor(() => expect(f.port.send).toHaveBeenCalledOnce())
    f.controller.dispose()
    expect(f.release).toHaveBeenCalledOnce()
    const snapshot = f.controller.getSnapshot()
    gate.resolve()
    await task
    await f.controller.resume()
    await f.controller.start(selection)
    await f.controller.newChat()
    expect(f.controller.getSnapshot()).toBe(snapshot)
    expect(f.port.send).toHaveBeenCalledTimes(stage === 'send' ? 1 : 0)
    expect(f.storage.setItem).not.toHaveBeenCalled()
    expect(f.release).toHaveBeenCalledOnce()
  })
})
