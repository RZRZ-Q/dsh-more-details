// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseWebChatReferencePrompt, serializeWebChatReference } from '../../src/shared/webchat-reference.js'
import {
  addWebChatReference, createWebChatReferenceSource, WebChatDraftReferences,
  WebChatReferenceCard, webChatReferences, WEBCHAT_REFERENCE_SOURCE,
} from '../../src/client/parent-composer/webchat-reference.js'
import { annotatedUserMessageRenderer } from '../../src/client/parent-composer/ParentConversationAnnotations.js'
import { deferredComposerReferenceFixture, lexicalComposerReferenceFixture } from './composer-reference-fixture.js'
import { webChatReferenceFixture } from './webchat-reference.fixture.js'
import { localeFixture } from '../fixtures/locale.js'

afterEach(cleanup)

describe('网页讨论引用', () => {
  it('编辑接受后即返回成功，等真实 commit 才通知持久化和呈现预览', () => {
    const fixture = deferredComposerReferenceFixture('保留的主会话草稿')
    const committed = vi.fn()
    const reference = webChatReferenceFixture()
    const { rerender } = render(<WebChatDraftReferences locale={localeFixture('zh').locale} input={fixture.snapshot()} />)
    expect(addWebChatReference(fixture.input, reference, committed)).toBe(true)
    expect(committed).not.toHaveBeenCalled()
    expect(fixture.snapshot().occurrences).toHaveLength(0)
    fixture.commit()
    expect(committed).toHaveBeenCalledOnce()
    expect(fixture.snapshot().draft).toBe('@方案比较 保留的主会话草稿')
    rerender(<WebChatDraftReferences locale={localeFixture('zh').locale} input={fixture.snapshot()} />)
    expect(screen.getByText('网页讨论引用（1）')).toBeInTheDocument()
    fixture.commit()
    expect(committed).toHaveBeenCalledOnce()
  })
  it('插入和刷新同一网页引用时保留草稿与文件 chip，已序列化快照不变', async () => {
    const fixture = lexicalComposerReferenceFixture('请按结论修改实现')
    fixture.input.insertReference({ source: 'files', ref: 'README.md', label: 'README.md',
      appearance: 'file', clipboardText: '@README.md' }, { start: 0, end: 0, draftRev: 0 })
    const reference = webChatReferenceFixture()
    expect(addWebChatReference(fixture.input, reference)).toBe(true)
    const before = fixture.snapshot()
    expect(addWebChatReference(fixture.input, reference)).toBe(true)
    expect(fixture.snapshot()).toBe(before)
    const source = createWebChatReferenceSource(() => {}, localeFixture('zh').locale)
    const sent = await source.codec.serialize(before.occurrences[0]!.ref, new AbortController().signal)
    const newId = `sha256:${'b'.repeat(64)}`
    const next = { ...reference, referenceId: newId, capturedAt: '2026-10-15T12:30:00.000Z',
      attachment: { ...reference.attachment, attachmentId: newId as typeof reference.attachment.attachmentId } }
    expect(addWebChatReference(fixture.input, next)).toBe(true)
    expect(fixture.snapshot().draft).toBe(before.draft)
    expect(fixture.snapshot().occurrences.map(occurrence => occurrence.source)).toEqual([WEBCHAT_REFERENCE_SOURCE, 'files'])
    expect(webChatReferences(fixture.snapshot())).toEqual([next])
    expect(parseWebChatReferencePrompt(sent)?.reference.referenceId).toBe(reference.referenceId)
    expect(sent).toContain('read_webchat_reference')
  })

  it('使用官方 openReference 重开网页，并拒绝损坏引用', () => {
    const onOpen = vi.fn()
    const source = createWebChatReferenceSource(onOpen, localeFixture('zh').locale)
    const reference = webChatReferenceFixture()
    expect(source.openReference?.({}, { ref: JSON.stringify(reference) })).toBe(true)
    expect(onOpen).toHaveBeenCalledWith(reference)
    expect(source.openReference?.({}, { ref: 'broken' })).toBe(false)
    expect(source.openReference?.({}, { ref: JSON.stringify({ ...reference, url: 'https://example.com' }) })).toBe(false)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('损坏引用的错误提示使用当前 DSH 语言，序列化内容不受语言影响', async () => {
    const language = localeFixture('en')
    const source = createWebChatReferenceSource(() => {}, language.locale)
    const signal = new AbortController().signal
    await expect(source.codec.serialize('broken', signal)).rejects.toThrow('This web discussion reference is invalid.')
    const reference = webChatReferenceFixture()
    const english = await source.codec.serialize(JSON.stringify(reference), signal)
    language.setLanguage('zh')
    await expect(source.codec.serialize('broken', signal)).rejects.toThrow('网页讨论引用已失效')
    expect(await source.codec.serialize(JSON.stringify(reference), signal)).toBe(english)
  })

  it('输入被占用或发送取消时不改写草稿', async () => {
    const fixture = lexicalComposerReferenceFixture('保留内容')
    const input = { ...fixture.input, insertReference: vi.fn(() => false) }
    expect(addWebChatReference(input, webChatReferenceFixture())).toBe(false)
    expect(fixture.snapshot().draft).toBe('保留内容')
    const signal = AbortSignal.abort(new Error('cancelled'))
    await expect(createWebChatReferenceSource(() => {}, localeFixture('zh').locale).codec.serialize(JSON.stringify(webChatReferenceFixture()), signal))
      .rejects.toThrow('cancelled')
  })

  it('展示范围、采集时间与代码预览，点击重开只回传同一引用', () => {
    const onOpen = vi.fn()
    const reference = webChatReferenceFixture()
    render(<WebChatReferenceCard locale={localeFixture('zh').locale} reference={reference} onOpen={onOpen} />)
    expect(screen.getByText(/当前已渲染分支/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('查看引用预览'))
    expect(document.querySelector('details')).toHaveAttribute('open')
    expect(document.querySelector('time')).toHaveAttribute('datetime', reference.capturedAt)
    expect(screen.getByText(/const value = 3.24/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '打开网页聊天' }))
    expect(onOpen).toHaveBeenCalledWith(reference)
  })

  it('从持久化用户消息重建可点击卡片，正文和附件继续交给原渲染器', () => {
    const language = localeFixture('zh')
    const onOpen = vi.fn()
    const received = vi.fn()
    const Original = (props: { readonly node: { readonly data: { readonly content: readonly unknown[] } } }) => {
      received(props.node.data.content)
      return <div data-testid="native-content">{JSON.stringify(props.node.data.content)}</div>
    }
    const Renderer = annotatedUserMessageRenderer(Original, language.locale, onOpen)
    const reference = webChatReferenceFixture()
    render(<Renderer node={{ data: { content: [
      { type: 'text', text: `${serializeWebChatReference(reference)}\n\n按此结论继续。` },
      { type: 'image', url: 'attachment:test' },
    ] } }} />)
    expect(screen.getByTestId('native-content')).toHaveTextContent('按此结论继续。')
    expect(screen.getByTestId('native-content')).not.toHaveTextContent('readingInstructions')
    expect(received).toHaveBeenCalledWith([
      { type: 'text', text: '按此结论继续。' }, { type: 'image', url: 'attachment:test' },
    ])
    fireEvent.click(screen.getByRole('button', { name: '打开网页聊天' }))
    expect(onOpen.mock.calls[0]?.[0]).toMatchObject(reference)
    act(() => { language.setLanguage('en') })
    expect(screen.getByRole('article')).toHaveAccessibleName(`Web discussion reference: ${reference.title}`)
    fireEvent.click(screen.getByRole('button', { name: 'Open Web Chat' }))
    expect(onOpen.mock.calls[1]?.[0]).toMatchObject(reference)
    expect(screen.getByTestId('native-content')).toHaveTextContent('按此结论继续。')
    expect(received).toHaveBeenLastCalledWith([
      { type: 'text', text: '按此结论继续。' }, { type: 'image', url: 'attachment:test' },
    ])
  })

  it('草稿与引用卡实时切换语言，保留预览展开、标题、正文和引用内容', () => {
    const language = localeFixture('zh')
    const fixture = lexicalComposerReferenceFixture('我的未发送草稿')
    const reference = webChatReferenceFixture({ preview: [
      { id: 'question-7', role: 'user', content: '保留用户问题' }, ...webChatReferenceFixture().preview,
    ] })
    addWebChatReference(fixture.input, reference)
    const before = fixture.snapshot()
    const onOpen = vi.fn()
    render(<WebChatDraftReferences input={before} locale={language.locale} onOpen={onOpen} />)
    fireEvent.click(screen.getByText('网页讨论引用（1）'))
    fireEvent.click(screen.getByText('查看引用预览'))
    const previews = [...document.querySelectorAll('details')]
    expect(previews.every(preview => preview.open)).toBe(true)
    act(() => { language.setLanguage('en') })
    expect(screen.getByText('Web discussion references (1)')).toBeInTheDocument()
    expect(screen.getByText('Preview reference')).toBeInTheDocument()
    expect(screen.getByText(/Currently rendered branch/)).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('保留用户问题')).toBeInTheDocument()
    expect(screen.getByText(`Web discussion · ${reference.title}`)).toBeInTheDocument()
    expect(screen.getByText(/const value = 3.24/)).toBeInTheDocument()
    expect(previews.every(preview => preview.open)).toBe(true)
    expect(fixture.snapshot()).toBe(before)
    expect(webChatReferences(before)).toEqual([reference])
    fireEvent.click(screen.getByRole('button', { name: 'Open Web Chat' }))
    expect(onOpen).toHaveBeenCalledWith(reference)
    act(() => { language.setLanguage('zh') })
    expect(screen.getByText('网页讨论引用（1）')).toBeInTheDocument()
    expect(fixture.snapshot()).toBe(before)
  })

  it('草稿预览只展示实际仍在输入框中的网页引用', () => {
    const fixture = lexicalComposerReferenceFixture('继续')
    const { rerender } = render(<WebChatDraftReferences locale={localeFixture('zh').locale} input={fixture.snapshot()} />)
    expect(screen.queryByText(/网页讨论引用/)).not.toBeInTheDocument()
    addWebChatReference(fixture.input, webChatReferenceFixture())
    rerender(<WebChatDraftReferences locale={localeFixture('zh').locale} input={fixture.snapshot()} />)
    expect(screen.getByText('网页讨论引用（1）')).toBeInTheDocument()
    fixture.input.setDraft('继续')
    rerender(<WebChatDraftReferences locale={localeFixture('zh').locale} input={fixture.snapshot()} />)
    expect(screen.queryByText(/网页讨论引用/)).not.toBeInTheDocument()
  })

  it('在普通文字之间的多个引用也展示为卡片，损坏标记保留原文', () => {
    const Original = ({ node }: { readonly node: { readonly data: { readonly content: readonly unknown[] } } }) => (
      <div data-testid="native-content">{JSON.stringify(node.data.content)}</div>
    )
    const Renderer = annotatedUserMessageRenderer(Original, localeFixture('zh').locale, () => {})
    const first = webChatReferenceFixture()
    const secondId = `sha256:${'b'.repeat(64)}`
    const second = webChatReferenceFixture({ referenceId: secondId,
      attachment: { ...first.attachment, attachmentId: secondId as typeof first.attachment.attachmentId } })
    const invalid = '<dsh_webchat_reference>保留原文</dsh_webchat_reference>'
    render(<Renderer node={{ data: { content: [{ type: 'text',
      text: `先读 ${serializeWebChatReference(first)} 再对照 ${serializeWebChatReference(second)} ${invalid} 最后继续。`,
    }] } }} />)
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByTestId('native-content')).toHaveTextContent('先读 再对照')
    expect(screen.getByTestId('native-content')).toHaveTextContent(invalid)
    expect(screen.getByTestId('native-content')).toHaveTextContent('最后继续。')
    expect(screen.getByTestId('native-content')).not.toHaveTextContent('readingInstructions')
  })
})
