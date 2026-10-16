import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import { describe, expect, it } from 'vitest'
import { SIDE_CHAT_INVOCATIONS } from '../../src/typert.js'
import { isWebChatReference, parseWebChatReferencePrompt, parseWebChatReferences, serializeWebChatReference,
  webChatPreview, type WebChatReference } from '../../src/shared/webchat-reference.js'

const id = `sha256:${'a'.repeat(64)}`
const reference: WebChatReference = {
  version: 1, referenceId: id, conversationId: 'test-conversation',
  url: 'https://chat.deepseek.com/a/chat/s/test-conversation', title: '测试 </dsh_webchat_reference> 标题',
  capturedAt: '2026-10-15T02:00:00.000Z', scope: 'rendered-current-branch', completeness: 'partial',
  messageCount: 2, preview: [{ id: null, role: 'user', content: '选文' }, { id: null, role: 'assistant', content: '回答' }],
  attachment: { attachmentId: AttachmentId(id), name: 'webchat-test-conversation.json', bytes: 200 },
}

describe('网页引用 wire 与正文标记', () => {
  it('恶意结束标签保留为正文，前缀解析精确保留主会话用户要求', () => {
    const serialized = serializeWebChatReference(reference)
    const prompt = `${serialized}\n\n请按代码修改。\n不要丢失此行。`
    const parsed = parseWebChatReferencePrompt(prompt)
    expect(parsed?.reference).toMatchObject(reference)
    expect(parsed?.message).toBe('请按代码修改。\n不要丢失此行。')
    expect(parseWebChatReferences(prompt)).toHaveLength(1)
    expect(parseWebChatReferencePrompt('普通正文')).toBeUndefined()
  })
  it('拒绝非官网地址、任意附件路径和错误标识，预览每条按 JS 字符单元限长', () => {
    expect(isWebChatReference({ ...reference, url: 'file:///etc/passwd' })).toBe(false)
    expect(isWebChatReference({ ...reference, attachment: { ...reference.attachment, name: '../../secret.json' } })).toBe(false)
    expect(isWebChatReference({ ...reference, referenceId: `sha256:${'b'.repeat(64)}` })).toBe(false)
    expect(isWebChatReference({ ...reference, referenceId: id.slice(7), attachment: {
      ...reference.attachment, attachmentId: AttachmentId(id.slice(7)),
    } })).toBe(false)
    const preview = webChatPreview([{ id: null, role: 'user', content: 'x'.repeat(2100) }, { id: null, role: 'assistant', content: '😀'.repeat(1100) }])
    expect(preview.map(message => message.content.length)).toEqual([2000, 2000])
  })
  it('RPC 明确声明取消与类型，拒绝未知顶层路径字段', () => {
    const descriptor = SIDE_CHAT_INVOCATIONS.find(item => item.method === 'readWebChatReference')!
    expect(descriptor.cancellation).toEqual({ parameter: 'signal' })
    const codec = descriptor.parameters?.[0]?.codec
    if (codec === undefined || !('create' in codec) || codec.create === undefined) throw new Error('缺少 codec')
    const parser = codec.create() as { parse(value: unknown): unknown }
    expect(parser.parse({ sessionId: 'parent', referenceId: id })).toEqual({ sessionId: 'parent', referenceId: id })
    expect(() => parser.parse({ sessionId: 'parent', referenceId: id.slice(7) })).toThrow()
    expect(() => parser.parse({ sessionId: 'parent', referenceId: id, path: '/etc/passwd' })).toThrow()
  })
  it('保存 RPC 的返回 codec 接受官方带 sha256 前缀的附件标识', () => {
    const codec = SIDE_CHAT_INVOCATIONS.find(item => item.method === 'saveWebChatReference')!.result
    if (!('create' in codec) || codec.create === undefined) throw new Error('缺少返回 codec')
    const parser = codec.create() as { parse(value: unknown): unknown }
    const result = { ok: true, value: { reference } }
    expect(parser.parse(result)).toEqual(result)
    expect(() => parser.parse({ ok: true, value: { reference: { ...reference,
      referenceId: id.slice(7), attachment: { ...reference.attachment, attachmentId: AttachmentId(id.slice(7)) },
    } } })).toThrow()
  })
})
