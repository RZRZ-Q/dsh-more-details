import type { ReactNode } from 'react'
import {
  isWebChatReference, serializeWebChatReference, type WebChatReference,
} from '../../shared/webchat-reference.js'
import {
  editComposerWithCommit, occurrenceEditSpan,
  type ParentComposerInput, type ParentComposerInputSnapshot,
  type ParentComposerOccurrence, type SelectionReferenceSource,
} from './composer-reference.js'

export const WEBCHAT_REFERENCE_SOURCE = 'dsh-more-details-webchat'
export type OpenWebChatReference = (reference: WebChatReference) => void

function decodeReference(ref: string): WebChatReference {
  const value: unknown = JSON.parse(ref)
  if (!isWebChatReference(value)) throw new Error('网页讨论引用已失效，请重新添加。')
  return value
}

export function webChatReferences(snapshot: ParentComposerInputSnapshot): readonly WebChatReference[] {
  return snapshot.occurrences.flatMap((occurrence) => {
    if (occurrence.source !== WEBCHAT_REFERENCE_SOURCE) return []
    try { return [decodeReference(occurrence.ref)] } catch { return [] }
  })
}

function matchingOccurrences(snapshot: ParentComposerInputSnapshot, conversationId: string): readonly ParentComposerOccurrence[] {
  return snapshot.occurrences.filter((occurrence) => {
    if (occurrence.source !== WEBCHAT_REFERENCE_SOURCE) return false
    try { return decodeReference(occurrence.ref).conversationId === conversationId } catch { return false }
  })
}

/** 只更新未发送草稿内同一网页的引用，已发送消息中的快照保持不变。 */
export function addWebChatReference(input: ParentComposerInput, reference: WebChatReference, onCommitted?: () => void): boolean {
  const before = input.state.getSnapshot()
  const existing = matchingOccurrences(before, reference.conversationId)
  const ref = JSON.stringify(reference)
  if (existing.some(occurrence => occurrence.ref === ref)) { onCommitted?.(); return true }
  const target = existing[0]
  const span = target === undefined ? { start: 0, end: 0, draftRev: before.draftRev }
    : occurrenceEditSpan(input, before, target)
  if (span === undefined) return false
  // insertReference 的 true 已确认编辑被接受；状态发布可晚于这个调用返回。
  return editComposerWithCommit(input, () => input.insertReference({
    source: WEBCHAT_REFERENCE_SOURCE, ref, label: reference.title,
    appearance: 'session', clipboardText: `@${reference.title}`,
  }, span), () => { onCommitted?.() })
}

/** 草稿 chip 使用 DSH 官方 openReference 钩子，避免伪装成 DSH Session ID。 */
export function createWebChatReferenceSource(onOpen: OpenWebChatReference): SelectionReferenceSource {
  return {
    trigger: '@', name: WEBCHAT_REFERENCE_SOURCE, order: 1_002,
    candidates: async () => [], onPick: () => undefined,
    openReference: (_session, reference) => {
      let decoded: WebChatReference
      try { decoded = decodeReference(reference.ref) } catch { return false }
      onOpen(decoded)
      return true
    },
    codec: {
      clipboardText: ref => `@${decodeReference(ref).title}`,
      serialize: async (ref, signal) => {
        if (signal.aborted) throw signal.reason
        return serializeWebChatReference(decodeReference(ref))
      },
    },
  }
}

export function WebChatReferenceCard({ reference, onOpen }: {
  readonly reference: WebChatReference
  readonly onOpen?: OpenWebChatReference
}): ReactNode {
  return (
    <article className="dsh-webchat-reference" aria-label={`网页讨论引用：${reference.title}`}>
      <div className="dsh-webchat-reference-heading">
        <span className="dsh-webchat-reference-title">网页讨论 · {reference.title}</span>
        {onOpen === undefined ? null : <button type="button" onClick={() => onOpen(reference)}>打开网页聊天</button>}
      </div>
      <div className="dsh-webchat-reference-meta">
        已采集 {reference.messageCount} 条消息 · 当前已渲染分支，可能不含更早历史
      </div>
      <details className="dsh-webchat-reference-preview">
        <summary>查看引用预览</summary>
        <p>采集时间：<time dateTime={reference.capturedAt}>{new Date(reference.capturedAt).toLocaleString()}</time></p>
        <p>完整已采集正文随引用保存，DSH 可按需读取。网页后续变化不会改写此快照。</p>
        {reference.preview.map((message, index) => (
          <section key={`${message.id ?? 'message'}:${index}`} className="dsh-webchat-reference-message">
            <strong>{message.role === 'user' ? '你' : 'DeepSeek'}</strong>
            <pre>{message.content}</pre>
          </section>
        ))}
      </details>
    </article>
  )
}

export function WebChatDraftReferences({ input, onOpen }: {
  readonly input: ParentComposerInputSnapshot
  readonly onOpen?: OpenWebChatReference
}): ReactNode {
  const references = webChatReferences(input)
  if (references.length === 0) return null
  return (
    <details className="dsh-webchat-reference-draft">
      <summary>网页讨论引用（{references.length}）</summary>
      {references.map(reference => <WebChatReferenceCard key={reference.referenceId} reference={reference}
        {...(onOpen === undefined ? {} : { onOpen })} />)}
    </details>
  )
}
