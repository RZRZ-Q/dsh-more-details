import { describe, expect, it, vi } from 'vitest'
import type { SessionId as DshSessionId } from '@deepseek-ai/dsh-session/types'
import type { DshClientContext } from '../../src/client/dsh/context.js'
import { MoreDetailsController, type PrepareDetails } from '../../src/client/dsh/more-details-controller.js'
import { SessionId, type ConversationSelection } from '../../src/shared/contracts.js'
import { deferred } from '../fixtures/client-runtime.js'

const selection: ConversationSelection = {
  parentSessionId: SessionId('parent-1'), text: 'Selected passage', atSeq: 7, fragments: [],
  rect: { x: 0, y: 0, width: 10, height: 10, viewportWidth: 800, viewportHeight: 600 },
}
const newId = 'details-1' as DshSessionId
const promptText = 'Custom prompt with captured context'
type PromptResult = { ok: true; value: undefined } | { ok: false; error: { code: string; message: string } }

function fixture() {
  const workspaceSnapshot = { items: [{ workspaceId: 'project-1', sessionIds: ['parent-1'] }] }
  const sessionSnapshot = { byId: { 'parent-1': { cwd: '/projects/source' } } }
  let openSnapshot: { openState: string; openError?: { message: string } } = { openState: 'open' }
  const prompt = vi.fn<(...args: unknown[]) => Promise<PromptResult>>()
    .mockResolvedValue({ ok: true, value: undefined })
  const beginSubmission = vi.fn(() => ({ requestId: 'submission-1' }))
  const reference = { binding: { session: { getSnapshot: () => openSnapshot, beginSubmission, prompt } } }
  const using = vi.fn(async (
    _id: DshSessionId,
    _options: unknown,
    operation: (value: typeof reference) => Promise<void>,
  ) => { await operation(reference) })
  const create = vi.fn<(...args: unknown[]) => Promise<DshSessionId>>().mockResolvedValue(newId)
  const openSession = vi.fn()
  const ctx = {
    sessions: { create, using, list: { getSnapshot: () => sessionSnapshot } },
    workspaces: { list: { getSnapshot: () => workspaceSnapshot } },
    uiWorkspace: { openSession },
  } as unknown as DshClientContext
  const release = vi.fn()
  const source = { selectionIsCurrent: vi.fn(() => true), retainParent: vi.fn(() => release) }
  const prepare = vi.fn<PrepareDetails>().mockResolvedValue({ ok: true, value: { prompt: promptText } })
  const controller = new MoreDetailsController(ctx, prepare, source)
  return {
    controller, prepare, source, release, create, using, prompt, beginSubmission, openSession,
    workspaceSnapshot, sessionSnapshot,
    setOpenSnapshot: (snapshot: typeof openSnapshot) => { openSnapshot = snapshot },
  }
}

describe('更多详情正式会话控制器', () => {
  it('把来源项目与选文固定下来，只向新建返回的会话 ID 发送', async () => {
    const f = fixture()
    const prepared = deferred<Awaited<ReturnType<PrepareDetails>>>()
    f.prepare.mockReturnValue(prepared.promise)
    const started = f.controller.start(selection)
    expect(f.source.retainParent).toHaveBeenCalledWith(selection.parentSessionId)
    // 等待期间界面切换到其他项目，不能改变已捕获的创建位置或发送目标。
    f.workspaceSnapshot.items.splice(0, 1, { workspaceId: 'other-project', sessionIds: ['other-session'] })
    prepared.resolve({ ok: true, value: { prompt: promptText } })
    await started

    expect(f.prepare).toHaveBeenCalledWith({ parentSessionId: selection.parentSessionId, atSeq: 7, selectedText: selection.text })
    expect(f.create).toHaveBeenCalledExactlyOnceWith({ workspaceId: 'project-1' })
    expect(f.using).toHaveBeenCalledWith(newId, { source: 'controllerOperation' }, expect.any(Function))
    expect(f.beginSubmission).toHaveBeenCalledWith({ mode: 'queue', text: promptText, attachments: [] })
    expect(f.prompt).toHaveBeenCalledExactlyOnceWith([{ type: 'text', text: promptText }], 'queue', undefined, 'submission-1')
    expect(f.openSession).toHaveBeenCalledExactlyOnceWith(newId)
    expect(f.release).toHaveBeenCalledOnce()
    expect(f.controller.getSnapshot()).toEqual({ busy: false })
  })

  it('来源没有 workspace 时使用来源 cwd，绝不同时提交两个位置字段', async () => {
    const f = fixture()
    f.workspaceSnapshot.items.length = 0
    await f.controller.start(selection)
    expect(f.create).toHaveBeenCalledExactlyOnceWith({ cwd: '/projects/source' })
  })

  it('拒绝已经失效的选区，不生成 prompt 或创建会话', async () => {
    const f = fixture()
    f.source.selectionIsCurrent.mockReturnValue(false)
    await f.controller.start(selection)
    expect(f.prepare).not.toHaveBeenCalled()
    expect(f.create).not.toHaveBeenCalled()
    expect(f.controller.getSnapshot()).toMatchObject({ busy: false, message: expect.stringContaining('选文已变化') })
  })

  it('创建或准备进行中重复点击，只创建和发送一次', async () => {
    const f = fixture()
    const created = deferred<DshSessionId>()
    f.create.mockReturnValue(created.promise)
    const started = f.controller.start(selection)
    await f.controller.start(selection)
    await vi.waitFor(() => expect(f.create).toHaveBeenCalledOnce())
    await f.controller.start(selection)
    created.resolve(newId)
    await started
    expect(f.prepare).toHaveBeenCalledOnce()
    expect(f.prompt).toHaveBeenCalledOnce()
    expect(f.release).toHaveBeenCalledOnce()
  })

  it('项目绑定部分失败保留返回的真实 ID，重试只发送到该会话', async () => {
    const f = fixture()
    f.create.mockRejectedValue({ rpcError: {
      code: 'session/workspace-attach-failed', message: 'Workspace closed', details: { sessionId: newId },
    } })
    await f.controller.start(selection)
    expect(f.controller.getSnapshot()).toMatchObject({ busy: false, sessionId: newId, retryable: true })
    expect(f.openSession).toHaveBeenCalledWith(newId)
    expect(f.prompt).not.toHaveBeenCalled()
    await f.controller.start(selection)
    await f.controller.retry()
    expect(f.create).toHaveBeenCalledOnce()
    expect(f.prepare).toHaveBeenCalledOnce()
    expect(f.using).toHaveBeenCalledWith(newId, { source: 'controllerOperation' }, expect.any(Function))
    expect(f.prompt).toHaveBeenCalledOnce()
  })

  it('新会话打开失败阻止发送，恢复后在同一个会话重试', async () => {
    const f = fixture()
    f.setOpenSnapshot({ openState: 'error', openError: { message: 'Cannot open session' } })
    await f.controller.start(selection)
    expect(f.beginSubmission).not.toHaveBeenCalled()
    expect(f.prompt).not.toHaveBeenCalled()
    expect(f.controller.getSnapshot()).toMatchObject({ sessionId: newId, retryable: true, message: expect.stringContaining('Cannot open session') })
    f.setOpenSnapshot({ openState: 'open' })
    await f.controller.retry()
    expect(f.create).toHaveBeenCalledOnce()
    expect(f.prompt).toHaveBeenCalledOnce()
  })

  it('等待会话引用 ready 失败时不提交，保留新 ID 供恢复', async () => {
    const f = fixture()
    f.using.mockRejectedValueOnce(new Error('Reference readiness failed'))
    await f.controller.start(selection)
    expect(f.beginSubmission).not.toHaveBeenCalled()
    expect(f.prompt).not.toHaveBeenCalled()
    expect(f.controller.getSnapshot()).toMatchObject({ sessionId: newId, retryable: true })
    await f.controller.retry()
    expect(f.create).toHaveBeenCalledOnce()
    expect(f.prompt).toHaveBeenCalledOnce()
  })

  it('明确拒绝发送后允许重试，但不重复创建会话', async () => {
    const f = fixture()
    f.prompt.mockResolvedValueOnce({ ok: false, error: { code: 'session/busy', message: 'Not accepted' } })
    await f.controller.start(selection)
    expect(f.controller.getSnapshot()).toMatchObject({ sessionId: newId, retryable: true })
    await f.controller.retry()
    expect(f.create).toHaveBeenCalledOnce()
    expect(f.prepare).toHaveBeenCalledOnce()
    expect(f.prompt).toHaveBeenCalledTimes(2)
    expect(f.controller.getSnapshot()).toEqual({ busy: false })
  })

  it.each(['gateway/internal', 'gateway/cancelled'])('发送结果为 %s 时禁止自动重试，避免重复消息', async code => {
    const f = fixture()
    f.prompt.mockResolvedValueOnce({ ok: false, error: { code, message: 'Result unknown' } })
    await f.controller.start(selection)
    expect(f.controller.getSnapshot()).toMatchObject({ sessionId: newId, retryable: false })
    await f.controller.retry()
    await f.controller.start(selection)
    expect(f.create).toHaveBeenCalledOnce()
    expect(f.prompt).toHaveBeenCalledOnce()
    f.controller.openCreated()
    expect(f.openSession).toHaveBeenLastCalledWith(newId)
  })

  it('提交后传输异常同样视作结果未知，不重新发送', async () => {
    const f = fixture()
    f.prompt.mockRejectedValueOnce(new Error('Connection lost after submit'))
    await f.controller.start(selection)
    expect(f.controller.getSnapshot()).toMatchObject({ sessionId: newId, retryable: false })
    await f.controller.retry()
    expect(f.prompt).toHaveBeenCalledOnce()
  })

  it('准备请求在卸载后失败时，不再发布错误或创建会话', async () => {
    const f = fixture()
    const prepared = deferred<void>()
    const listener = vi.fn()
    f.prepare.mockReturnValue(prepared.promise.then(() => { throw new Error('Preparation connection closed') }))
    f.controller.subscribe(listener)
    const started = f.controller.start(selection)
    expect(listener).toHaveBeenCalledOnce()

    f.controller.dispose()
    prepared.resolve()
    await started

    expect(f.controller.getSnapshot()).toEqual({ busy: false })
    expect(listener).toHaveBeenCalledOnce()
    expect(f.create).not.toHaveBeenCalled()
    expect(f.openSession).not.toHaveBeenCalled()
    expect(f.release).toHaveBeenCalledOnce()
  })

  it.each(['created', 'workspace-attach-failed'] as const)('创建结果 %s 在卸载后返回时，保留会话但不发送或导航', async outcome => {
    const f = fixture()
    const created = deferred<DshSessionId>()
    const listener = vi.fn()
    f.create.mockReturnValue(created.promise.then(id => {
      if (outcome === 'workspace-attach-failed') throw { rpcError: {
        code: 'session/workspace-attach-failed', message: 'Workspace closed', details: { sessionId: id },
      } }
      return id
    }))
    f.controller.subscribe(listener)
    const started = f.controller.start(selection)
    await vi.waitFor(() => expect(f.create).toHaveBeenCalledOnce())

    f.controller.dispose()
    created.resolve(newId)
    await started
    await f.controller.retry()
    f.controller.openCreated()

    expect(f.controller.getSnapshot()).toEqual({ busy: false })
    expect(listener).toHaveBeenCalledOnce()
    expect(f.using).not.toHaveBeenCalled()
    expect(f.prompt).not.toHaveBeenCalled()
    expect(f.openSession).not.toHaveBeenCalled()
    expect(f.release).toHaveBeenCalledOnce()
  })

  it.each(['ready', 'failed'] as const)('引用在卸载后进入 %s 状态时，不提交或导航', async outcome => {
    const f = fixture()
    const ready = deferred<void>()
    const using = f.using.getMockImplementation()!
    f.using.mockImplementation(async (...args) => {
      await ready.promise
      if (outcome === 'failed') throw new Error('Reference readiness failed')
      await using(...args)
    })
    const started = f.controller.start(selection)
    await vi.waitFor(() => expect(f.using).toHaveBeenCalledOnce())

    f.controller.dispose()
    ready.resolve()
    await started

    expect(f.controller.getSnapshot()).toEqual({ busy: false })
    expect(f.beginSubmission).not.toHaveBeenCalled()
    expect(f.prompt).not.toHaveBeenCalled()
    expect(f.openSession).not.toHaveBeenCalled()
    expect(f.release).toHaveBeenCalledOnce()
  })

  it.each(['accepted', 'unknown', 'rejected'] as const)('发送结果 %s 在卸载后返回时，不导航或重新发送', async outcome => {
    const f = fixture()
    const sent = deferred<PromptResult>()
    const listener = vi.fn()
    f.prompt.mockReturnValue(sent.promise.then(result => {
      if (outcome === 'rejected') throw new Error('Connection lost after submit')
      return result
    }))
    f.controller.subscribe(listener)
    const started = f.controller.start(selection)
    await vi.waitFor(() => expect(f.prompt).toHaveBeenCalledOnce())

    f.controller.dispose()
    sent.resolve(outcome === 'unknown'
      ? { ok: false, error: { code: 'gateway/internal', message: 'Result unknown' } }
      : { ok: true, value: undefined })
    await started
    await f.controller.retry()
    await f.controller.start(selection)
    f.controller.openCreated()

    expect(f.controller.getSnapshot()).toEqual({ busy: false })
    expect(listener).toHaveBeenCalledOnce()
    expect(f.create).toHaveBeenCalledOnce()
    expect(f.prompt).toHaveBeenCalledOnce()
    expect(f.openSession).not.toHaveBeenCalled()
    expect(f.release).toHaveBeenCalledOnce()
  })
})
