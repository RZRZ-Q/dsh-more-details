import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-attachment'
import { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session-query'
import {
  isWebChatCapture, MAX_WEBCHAT_SNAPSHOT_BYTES, parseWebChatReferences, webChatConversationId, webChatPreview,
  type WebChatCapture, type WebChatReference, type SaveWebChatReferenceRequest, type ReadWebChatReferenceRequest,
} from '../shared/webchat-reference.js'

/** 只认当前会话的用户消息；模型输出或工具结果里的引用不授予读取权限。 */
export function findSubmittedWebChatReference(events: readonly SessionEvent[], referenceId: string): WebChatReference | undefined {
  for (const event of events) {
    if (event.type !== 'user/message' || event.data.source.kind !== 'user') continue
    for (const block of event.data.content) {
      if (block.type !== 'text') continue
      const reference = parseWebChatReferences(block.text).find(item => item.referenceId === referenceId)
      if (reference !== undefined) return reference
    }
  }
  return undefined
}

/** 正文仅存 DSH 不可变附件；授权来源始终是会话事件，不另建索引数据库。 */
export class WebChatReferenceStore {
  constructor(private readonly ctx: Context) {}

  async save(request: SaveWebChatReferenceRequest, signal: AbortSignal): Promise<WebChatReference> {
    if (!isWebChatCapture(request.capture)) throw new Error('网页讨论快照格式无效。')
    // 明确投递到存在的目标会话；这里只观察，不创建或修改会话。
    const observation = await this.ctx.sessionQuery.observeSession(SessionId(request.sessionId), { signal, projectionMode: 'none' })
    observation[Symbol.dispose]()
    signal.throwIfAborted()
    const source = request.capture
    const capture: WebChatCapture = {
      version: 1, url: source.url, title: source.title, capturedAt: source.capturedAt,
      scope: source.scope, completeness: source.completeness,
      messages: source.messages.map(message => ({ id: message.id, role: message.role, content: message.content })),
    }
    const data = new TextEncoder().encode(JSON.stringify(capture))
    if (data.byteLength > MAX_WEBCHAT_SNAPSHOT_BYTES) throw new Error('网页讨论快照超过 8 MiB，请缩小采集范围后重试。')
    const conversationId = webChatConversationId(capture.url)!
    const attachment = await this.ctx.attachments.saveFile({ data, name: `webchat-${conversationId}.json` })
    signal.throwIfAborted()
    return {
      version: 1, referenceId: attachment.attachmentId, conversationId,
      url: capture.url, title: capture.title, capturedAt: capture.capturedAt,
      scope: capture.scope, completeness: capture.completeness,
      messageCount: capture.messages.length, preview: webChatPreview(capture.messages), attachment,
    }
  }

  async read(request: ReadWebChatReferenceRequest, signal: AbortSignal): Promise<{ reference: WebChatReference; capture: WebChatCapture }> {
    const observation = await this.ctx.sessionQuery.observeSession(SessionId(request.sessionId), { signal, projectionMode: 'none' })
    let reference: WebChatReference | undefined
    try { reference = findSubmittedWebChatReference(observation.events, request.referenceId) }
    finally { observation[Symbol.dispose]() }
    if (reference === undefined) throw new Error('当前 DSH 会话没有已提交的这条网页引用。请先将引用发送到主会话。')
    return { reference, capture: await this.readAttachment(reference, signal) }
  }

  private async readAttachment(reference: WebChatReference, signal: AbortSignal): Promise<WebChatCapture> {
    const chunks: Uint8Array[] = []
    let bytes = 0
    for await (const chunk of this.ctx.attachments.readFileStream(reference.attachment, signal)) {
      signal.throwIfAborted()
      bytes += chunk.byteLength
      if (bytes > MAX_WEBCHAT_SNAPSHOT_BYTES) throw new Error('网页讨论快照超过允许的大小。')
      chunks.push(chunk)
    }
    if (bytes !== reference.attachment.bytes) throw new Error('网页讨论快照长度与引用不一致。')
    const data = new Uint8Array(bytes)
    let offset = 0
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength }
    const capture: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data))
    if (!isWebChatCapture(capture)
      || capture.url !== reference.url || capture.title !== reference.title || capture.capturedAt !== reference.capturedAt
      || capture.messages.length !== reference.messageCount
      || JSON.stringify(webChatPreview(capture.messages)) !== JSON.stringify(reference.preview)) {
      throw new Error('网页讨论快照与引用内容不一致。')
    }
    return capture
  }
}

/** 游标绑定不可变快照；翻页不会转向新的网页内容。 */
export function webChatReferencePage(reference: WebChatReference, capture: WebChatCapture, cursor?: string, limit = 10) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw new Error('limit 必须是 1 到 50 的整数。')
  let offset = 0
  if (cursor !== undefined) {
    const match = /^(sha256:[a-f0-9]{64}):(0|[1-9][0-9]*)$/u.exec(cursor)
    if (match?.[1] !== reference.referenceId) throw new Error('分页游标不属于这条网页引用。')
    offset = Number(match[2])
    if (!Number.isSafeInteger(offset) || offset > capture.messages.length) throw new Error('分页游标超出快照范围。')
  }
  const end = Math.min(offset + limit, capture.messages.length)
  return {
    referenceId: reference.referenceId, title: reference.title, url: reference.url, capturedAt: reference.capturedAt,
    scope: reference.scope, completeness: reference.completeness, messageCount: capture.messages.length,
    offset, nextCursor: end < capture.messages.length ? `${reference.referenceId}:${end}` : null,
    messages: capture.messages.slice(offset, end).map(message => ({ ...message })),
  }
}
