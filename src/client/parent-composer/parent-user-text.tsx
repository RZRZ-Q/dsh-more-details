import type { ReactNode } from 'react'
import type { UserTextNode, UserTextRule } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { ReferenceChip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { DshLocale } from '../dsh/locale.js'
import { useDshLocale } from '../dsh/locale.js'
import { SelectionQuote } from '../panel/SelectionQuote.js'
import { SIDE_CHAT_MESSAGES } from '../panel/messages.js'
import { parseAnnotatedConversationPrompt, unescapeXmlText, type ConversationAnnotation } from './add-to-conversation.js'
import { parseReferencedConversationPrompt, type ReferencedSideChatConversation } from './referenced-conversation.js'
import { WebChatReferenceCard, type OpenWebChatReference } from './webchat-reference.js'
import { parseWebChatReferencePrompt, WEBCHAT_REFERENCE_START, WEBCHAT_REFERENCE_END, type WebChatReference } from '../../shared/webchat-reference.js'

export const PARENT_REFERENCE_TEXT_ID = 'dsh-more-details-reference'
type ReferenceTextData =
  | { readonly kind: 'web'; readonly reference: WebChatReference }
  | { readonly kind: 'selection'; readonly annotations: readonly ConversationAnnotation[] }
  | { readonly kind: 'side-chat'; readonly reference: ReferencedSideChatConversation }
  | { readonly kind: 'question-session'; readonly label: string; readonly title: string }

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface UserTextDataMap {
    'dsh-more-details-reference': ReferenceTextData
  }
}

/** 旧协议允许 annotation 内保留原文，但 annotation 外的额外正文不能丢弃。 */
function completeSelectionBlock(block: string): boolean {
  const context = /^<selected_context(?: source="current-conversation" event-seq="\d+")?>\r?\n([\s\S]*?)\r?\n<\/selected_context>$/u.exec(block)
  if (context === null) return false
  if (block.startsWith('<selected_context source=')) return true
  const body = context[1] ?? ''
  let cursor = 0
  let count = 0
  for (const annotation of body.matchAll(/<annotation(?: index="\d+")?>\r?\n[\s\S]*?\r?\n<\/annotation>/gu)) {
    if (body.slice(cursor, annotation.index).trim() !== '') return false
    cursor = annotation.index + annotation[0].length
    count++
  }
  return count > 0 && body.slice(cursor).trim() === ''
}

/** 只替换已通过现有协议解析器验证的片段，正文与原生引用仍由宿主解析。 */
function referenceAt(text: string, start: number): UserTextNode<typeof PARENT_REFERENCE_TEXT_ID> | undefined {
  const suffix = text.slice(start)
  if (suffix.startsWith(WEBCHAT_REFERENCE_START)) {
    const parsed = parseWebChatReferencePrompt(suffix)
    if (parsed === undefined) return
    return { id: PARENT_REFERENCE_TEXT_ID, start,
      end: text.indexOf(WEBCHAT_REFERENCE_END, start + WEBCHAT_REFERENCE_START.length) + WEBCHAT_REFERENCE_END.length,
      data: { kind: 'web', reference: parsed.reference } }
  }
  if (suffix.startsWith('<selected_context')) {
    const end = text.indexOf('</selected_context>', start)
    if (end < 0) return
    const block = text.slice(start, end + '</selected_context>'.length)
    if (!completeSelectionBlock(block)) return
    const parsed = parseAnnotatedConversationPrompt(block)
    if (parsed === undefined) return
    return { id: PARENT_REFERENCE_TEXT_ID, start, end: end + '</selected_context>'.length,
      data: { kind: 'selection', annotations: parsed.annotations } }
  }
  if (suffix.startsWith('<referenced_conversation>')) {
    const parsed = parseReferencedConversationPrompt(suffix)
    if (parsed === undefined) return
    return { id: PARENT_REFERENCE_TEXT_ID, start,
      end: text.indexOf('</referenced_conversation>', start) + '</referenced_conversation>'.length,
      data: { kind: 'side-chat', reference: parsed.reference } }
  }
  return undefined
}

/** 旧侧聊首问的 question 只在合法 selection 后解码，普通 XML 保留原样。 */
function hasSelectionPrefix(text: string, questionStart: number): boolean {
  let selectionSeen = false
  let cursor = 0
  while (cursor < questionStart) {
    const whitespace = /^\s*/u.exec(text.slice(cursor))![0].length
    cursor += whitespace
    if (cursor === questionStart) return selectionSeen
    const reference = referenceAt(text, cursor)
    if (reference === undefined || reference.end > questionStart) return false
    if (reference.data.kind === 'selection') selectionSeen = true
    cursor = reference.end
  }
  return selectionSeen
}

/** 仅隐藏合法首问的标签和解码单个实体，让正文继续参与原生引用匹配。 */
function questionTextPart(text: string, from: number): UserTextNode<'text' | typeof PARENT_REFERENCE_TEXT_ID> | undefined {
  for (const opening of text.matchAll(/<user_question>/gu)) {
    const start = opening.index
    if (!hasSelectionPrefix(text, start)) continue
    const question = /^<user_question>(?:\r?\n)?([\s\S]*?)(?:\r?\n)?<\/user_question>(?=$|\s)/u.exec(text.slice(start))
    if (question === null) continue
    const end = start + question[0].length
    if (end <= from) continue
    const rawStart = start + '<user_question>'.length
    const rawEnd = end - '</user_question>'.length
    const rawBody = text.slice(rawStart, rawEnd)
    const bodyStart = rawStart + /^\s*/u.exec(rawBody)![0].length
    const bodyEnd = Math.max(bodyStart, rawEnd - /\s*$/u.exec(rawBody)![0].length)
    if (start >= from) return { id: 'text', start, end: bodyStart,
      data: { text: text.slice(start, bodyStart), display: '' } }
    const entities = /&(?:lt|gt|amp);/gu
    entities.lastIndex = Math.max(from, bodyStart)
    const entity = entities.exec(text)
    // 宿主先匹配完整 wire，后面的实体规则无法修改其中的 label。
    // 只在旧首问的转义 label 内处理官方 wire 语法，展示同一只读原生 chip。
    const wires = /@\[([^\]\n]+)\]\(dsh-session:[^)\s]+\)/gu
    wires.lastIndex = Math.max(from, bodyStart)
    for (let wire = wires.exec(text); wire !== null && wire.index < bodyEnd; wire = wires.exec(text)) {
      if (wire.index + wire[0].length > bodyEnd || !/&(?:lt|gt|amp);/u.test(wire[1] ?? '')) continue
      if (entity !== null && entity.index < wire.index) break
      return { id: PARENT_REFERENCE_TEXT_ID, start: wire.index, end: wire.index + wire[0].length,
        data: { kind: 'question-session', label: unescapeXmlText(wire[1] ?? ''), title: unescapeXmlText(wire[0]) } }
    }
    if (entity !== null && entity.index < bodyEnd) return {
      id: 'text', start: entity.index, end: entity.index + entity[0].length,
      data: { text: entity[0], display: unescapeXmlText(entity[0]) },
    }
    if (bodyEnd >= from) return { id: 'text', start: bodyEnd, end,
      data: { text: text.slice(bodyEnd, end), display: '' } }
  }
  return undefined
}

export const parentReferenceTextRule: UserTextRule<typeof PARENT_REFERENCE_TEXT_ID> = {
  id: PARENT_REFERENCE_TEXT_ID,
  order: 0,
  match(text, from) {
    const candidates = /<(?:dsh_webchat_reference>|selected_context(?:>| )|referenced_conversation>)/gu
    candidates.lastIndex = from
    let referenceCandidate: UserTextNode<typeof PARENT_REFERENCE_TEXT_ID> | undefined
    for (let match = candidates.exec(text); match !== null; match = candidates.exec(text)) {
      referenceCandidate = referenceAt(text, match.index)
      if (referenceCandidate !== undefined) break
    }
    const questionCandidate = questionTextPart(text, from)
    return questionCandidate !== undefined && (referenceCandidate === undefined || questionCandidate.start < referenceCandidate.start)
      ? questionCandidate : referenceCandidate
  },
}

export function ParentReferenceText({ node, interactive, locale, onOpenWebChat }: {
  readonly node: UserTextNode<typeof PARENT_REFERENCE_TEXT_ID>
  readonly interactive: boolean
  readonly locale: DshLocale
  readonly onOpenWebChat?: OpenWebChatReference
}): ReactNode {
  const { text } = useDshLocale(locale)
  const data = node.data
  if (data.kind === 'side-chat') return <ReferenceChip appearance="session" label={data.reference.title} title={data.reference.title} />
  if (data.kind === 'question-session') return <ReferenceChip appearance="session" label={data.label} title={data.title} />
  if (!interactive) {
    const label = data.kind === 'web' ? data.reference.title : text('选中内容', 'Selected passage')
    return <ReferenceChip appearance="session" label={label} title={label} />
  }
  if (data.kind === 'web') return <WebChatReferenceCard reference={data.reference} locale={locale}
    {...onOpenWebChat === undefined ? {} : { onOpen: onOpenWebChat }} />
  return <SelectionQuote selections={data.annotations} messages={SIDE_CHAT_MESSAGES[text('zh-CN', 'en') as keyof typeof SIDE_CHAT_MESSAGES]} />
}
