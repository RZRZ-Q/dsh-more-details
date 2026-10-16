import type { ReactNode } from 'react'
import { useDshLocale, type DshLocale } from '../dsh/locale.js'
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

function decodeReference(ref: string, invalidMessage = 'Invalid web discussion reference'): WebChatReference {
  let value: unknown
  try { value = JSON.parse(ref) } catch { throw new Error(invalidMessage) }
  if (!isWebChatReference(value)) throw new Error(invalidMessage)
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
export function createWebChatReferenceSource(onOpen: OpenWebChatReference, locale: DshLocale): SelectionReferenceSource {
  const decode = (ref: string): WebChatReference => decodeReference(ref, locale.resolveText({
    zh: '网页讨论引用已失效，请重新添加。', en: 'This web discussion reference is invalid. Please add it again.',
  }))
  return {
    trigger: '@', name: WEBCHAT_REFERENCE_SOURCE, order: 1_002,
    candidates: async () => [], onPick: () => undefined,
    openReference: (_session, reference) => {
      let decoded: WebChatReference
      try { decoded = decode(reference.ref) } catch { return false }
      onOpen(decoded)
      return true
    },
    codec: {
      clipboardText: ref => `@${decode(ref).title}`,
      serialize: async (ref, signal) => {
        if (signal.aborted) throw signal.reason
        return serializeWebChatReference(decode(ref))
      },
    },
  }
}

export function WebChatReferenceCard({ reference, onOpen, locale }: {
  readonly reference: WebChatReference
  readonly onOpen?: OpenWebChatReference
  readonly locale: DshLocale
}): ReactNode {
  const { active, text } = useDshLocale(locale)
  return (
    <article className="dsh-webchat-reference" aria-label={text(`网页讨论引用：${reference.title}`, `Web discussion reference: ${reference.title}`)}>
      <div className="dsh-webchat-reference-heading">
        <span className="dsh-webchat-reference-title">{text('网页讨论', 'Web discussion')} · {reference.title}</span>
        {onOpen === undefined ? null : <button type="button" onClick={() => onOpen(reference)}>{text('打开网页聊天', 'Open Web Chat')}</button>}
      </div>
      <div className="dsh-webchat-reference-meta">
        {text(`已采集 ${reference.messageCount} 条消息 · 当前已渲染分支，可能不含更早历史`, `${reference.messageCount} messages captured · Currently rendered branch; earlier history may be missing`)}
      </div>
      <details className="dsh-webchat-reference-preview">
        <summary>{text('查看引用预览', 'Preview reference')}</summary>
        <p>{text('采集时间：', 'Captured at: ')}<time dateTime={reference.capturedAt}>{new Date(reference.capturedAt).toLocaleString(active)}</time></p>
        <p>{text('完整已采集正文随引用保存，DSH 可按需读取。网页后续变化不会改写此快照。', 'The full captured text is saved with this reference for DSH to read on demand. Later changes on the website do not alter this snapshot.')}</p>
        {reference.preview.map((message, index) => (
          <section key={`${message.id ?? 'message'}:${index}`} className="dsh-webchat-reference-message">
            <strong>{message.role === 'user' ? text('你', 'You') : 'DeepSeek'}</strong>
            <pre>{message.content}</pre>
          </section>
        ))}
      </details>
    </article>
  )
}

export function WebChatDraftReferences({ input, onOpen, locale }: {
  readonly input: ParentComposerInputSnapshot
  readonly onOpen?: OpenWebChatReference
  readonly locale: DshLocale
}): ReactNode {
  const { text } = useDshLocale(locale)
  const references = webChatReferences(input)
  if (references.length === 0) return null
  return (
    <details className="dsh-webchat-reference-draft">
      <summary>{text(`网页讨论引用（${references.length}）`, `Web discussion references (${references.length})`)}</summary>
      {references.map(reference => <WebChatReferenceCard key={reference.referenceId} reference={reference} locale={locale}
        {...(onOpen === undefined ? {} : { onOpen })} />)}
    </details>
  )
}
