import { createHash } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { AttachmentId, type FileAttachmentRef, type SaveFileAttachment } from '@deepseek-ai/dsh-attachment'
import { createAssistantMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { ToolDefinition, ToolRunContext } from '@deepseek-ai/dsh-tools'
import { describe, expect, it, vi } from 'vitest'
import { findSubmittedWebChatReference, WebChatReferenceStore, webChatReferencePage } from '../../src/host/webchat-reference-store.js'
import { registerWebChatReferenceTool } from '../../src/host/webchat-reference-tool.js'
import { isWebChatReference, MAX_WEBCHAT_SNAPSHOT_BYTES, serializeWebChatReference,
  type WebChatCapture } from '../../src/shared/webchat-reference.js'

const signal = () => new AbortController().signal
const capture: WebChatCapture = {
  version: 1, url: 'https://chat.deepseek.com/a/chat/s/acceptance-test', title: '网页讨论引用验收',
  capturedAt: '2026-10-15T01:02:03.000Z', scope: 'rendered-current-branch', completeness: 'partial',
  messages: Array.from({ length: 8 }, (_, index) => ({ id: `message-${index}`,
    role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
    content: index === 1 ? `完整正文：${'中'.repeat(2300)}\n\n\`\`\`ts\nconst answer = 324\n\`\`\`\n$9-5.76=3.24$`
      : `第 ${index + 1} 条消息`,
  })),
}
function userEvent(text: string): SessionEvent {
  return { seq: 0, time: 0, type: 'user/message', surfaceOp: 'append',
    data: createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text }] }),
  } as unknown as SessionEvent
}
function fixture() {
  const objects = new Map<string, Uint8Array>()
  const events = new Map<string, SessionEvent[]>([['parent', []], ['other', []]])
  const release = vi.fn()
  const observeSession = vi.fn(async (id: string) => {
    const log = events.get(id)
    if (log === undefined) throw new Error('目标会话不存在。')
    return { events: log, [Symbol.dispose]: release }
  })
  const saveFile = vi.fn(async (input: SaveFileAttachment): Promise<FileAttachmentRef> => {
    const attachmentId = AttachmentId(`sha256:${createHash('sha256').update(input.data).digest('hex')}`)
    objects.set(attachmentId, input.data.slice())
    return { attachmentId, name: input.name!, bytes: input.data.byteLength }
  })
  const readFileStream = vi.fn(async function* (ref: FileAttachmentRef) {
    const bytes = objects.get(ref.attachmentId)
    if (bytes === undefined) throw new Error('附件缺失。')
    // UTF-8 字符可以跨 chunk 边界，读取必须按完整字节恢复。
    yield bytes.slice(0, 367)
    yield bytes.slice(367)
  })
  let tool: ToolDefinition | undefined
  const disposeTool = vi.fn()
  const ctx = {
    sessionQuery: { observeSession }, attachments: { saveFile, readFileStream },
    tools: { register: vi.fn((definition: ToolDefinition) => { tool = definition; return disposeTool }) },
  } as unknown as Context
  return { ctx, store: new WebChatReferenceStore(ctx), events, objects, saveFile, readFileStream,
    observeSession, release, getTool: () => tool!, disposeTool }
}

describe('网页引用 Host 存档与授权', () => {
  it('快照写入官方附件后，仅发送到主会话才可读；新实例能恢复完整正文', async () => {
    const f = fixture()
    const reference = await f.store.save({ sessionId: 'parent', capture }, signal())
    expect(isWebChatReference(reference)).toBe(true)
    expect(reference.referenceId).toMatch(/^sha256:[a-f0-9]{64}$/u)
    expect(reference.referenceId).toBe(reference.attachment.attachmentId)
    expect(reference.preview[0]?.id).toBe('message-2')
    expect(reference.preview).toHaveLength(6)
    await expect(f.store.read({ sessionId: 'parent', referenceId: reference.referenceId }, signal())).rejects.toThrow('没有已提交')
    expect(f.readFileStream).not.toHaveBeenCalled()
    f.events.get('parent')!.push(userEvent(`${serializeWebChatReference(reference)}\n请读取首轮代码。`))
    const reopened = new WebChatReferenceStore(f.ctx)
    const read = await reopened.read({ sessionId: 'parent', referenceId: reference.referenceId }, signal())
    expect(read.capture).toEqual(capture)
    expect(read.capture.messages[1]?.content).toContain('const answer = 324')
    expect(f.saveFile).toHaveBeenCalledOnce()
    expect(f.release).toHaveBeenCalledTimes(3)
  })

  it('拒绝跨会话 ID，assistant、工具结果和宿主注入不授予读取权限', async () => {
    const f = fixture()
    const reference = await f.store.save({ sessionId: 'parent', capture }, signal())
    const text = serializeWebChatReference(reference)
    f.events.get('parent')!.push(userEvent(text))
    await expect(f.store.read({ sessionId: 'other', referenceId: reference.referenceId }, signal())).rejects.toThrow('没有已提交')
    const assistant = { seq: 0, time: 0, type: 'assistant/message', data: { turn: 1, step: 1,
      message: createAssistantMessage({ source: { provider: 'test', model: 'test' }, content: [{ type: 'text', text }] }),
    } } as SessionEvent
    const original = userEvent(text)
    const injected = { ...original, data: { ...original.data, source: { kind: 'runtime-context' } } } as unknown as SessionEvent
    expect(findSubmittedWebChatReference([assistant, injected], reference.referenceId)).toBeUndefined()
    expect(f.readFileStream).not.toHaveBeenCalled()
  })

  it('分页包含预览之外的正文、可接续，并拒绝其他引用的游标', async () => {
    const f = fixture()
    const reference = await f.store.save({ sessionId: 'parent', capture }, signal())
    const page = webChatReferencePage(reference, capture, undefined, 2)
    expect(page.messages[1]?.content.length).toBeGreaterThan(2000)
    expect(page.completeness).toBe('partial')
    const second = webChatReferencePage(reference, capture, page.nextCursor!, 6)
    expect(second.offset).toBe(2)
    expect(second.messages).toHaveLength(6)
    expect(second.nextCursor).toBeNull()
    expect(() => webChatReferencePage(reference, capture, `sha256:${'a'.repeat(64)}:2`)).toThrow('不属于')
    expect(() => webChatReferencePage(reference, capture, `${reference.referenceId.slice(7)}:2`)).toThrow('不属于')
    expect(() => webChatReferencePage(reference, capture, undefined, 0)).toThrow('limit')
  })

  it('附件损坏或 metadata 不匹配时明确失败，保存超大正文和无效目标不会静默截断', async () => {
    const f = fixture()
    const reference = await f.store.save({ sessionId: 'parent', capture }, signal())
    f.events.get('parent')!.push(userEvent(serializeWebChatReference({ ...reference, title: '篡改的标题' })))
    await expect(f.store.read({ sessionId: 'parent', referenceId: reference.referenceId }, signal())).rejects.toThrow('不一致')
    await expect(f.store.save({ sessionId: 'missing', capture }, signal())).rejects.toThrow('不存在')
    await expect(f.store.save({ sessionId: 'parent', capture: { ...capture, messages: [
      { id: null, role: 'user', content: 'a'.repeat(MAX_WEBCHAT_SNAPSHOT_BYTES) },
    ] } }, signal())).rejects.toThrow('超过 8 MiB')
    expect(f.saveFile).toHaveBeenCalledOnce()
  })

  it('模型工具强制使用调用 Agent 的会话身份，不能以参数指定其他会话或路径', async () => {
    const f = fixture()
    const reference = await f.store.save({ sessionId: 'parent', capture }, signal())
    f.events.get('parent')!.push(userEvent(serializeWebChatReference(reference)))
    expect(registerWebChatReferenceTool(f.ctx, f.store)).toBe(f.disposeTool)
    const tool = f.getTool()
    expect(tool.name).toBe('read_webchat_reference')
    const exec = { agent: { session: { header: { id: 'parent' } } }, signal: signal() } as unknown as ToolRunContext
    const result = await tool.execute({ referenceId: reference.referenceId, limit: 2 }, exec)
    expect(result).toMatchObject({ messageCount: 8, offset: 0, messages: capture.messages.slice(0, 2) })
    await expect(tool.execute({ referenceId: reference.referenceId }, { ...exec, agent: undefined } as unknown as ToolRunContext)).rejects.toThrow('需要当前')
    await expect(tool.execute({ referenceId: reference.referenceId, sessionId: 'parent' }, {
      ...exec, agent: { session: { header: { id: 'other' } } },
    } as unknown as ToolRunContext)).rejects.toThrow('没有已提交')
  })
})
