// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountParentConversationAnnotations } from '../../src/client/parent-composer/ParentConversationAnnotations.js'
import { parentReferenceTextRule, PARENT_REFERENCE_TEXT_ID } from '../../src/client/parent-composer/parent-user-text.js'
import { buildSideChatPrompt } from '../../src/client/parent-composer/add-to-conversation.js'
import { serializeReferencedConversation } from '../../src/client/parent-composer/referenced-conversation.js'
import { serializeWebChatReference } from '../../src/shared/webchat-reference.js'
import { SessionId, type ConversationSelection } from '../../src/shared/contracts.js'
import { localeFixture } from '../fixtures/locale.js'
import { webChatReferenceFixture } from './webchat-reference.fixture.js'
import { officialUserTextFixture } from './official-user-text-fixture.js'

const selection: ConversationSelection = {
  parentSessionId: SessionId('parent'), fragments: [], text: 'Selected passage', atSeq: 1,
  rect: { x: 0, y: 0, width: 1, height: 1, viewportWidth: 800, viewportHeight: 600 },
}
afterEach(cleanup)

describe('official user-text projection', () => {
  it.each(['before', 'after'])('preserves native source chains when loaded %s native declarations', async order => {
    const onOpen = vi.fn()
    let dispose: () => void = () => {}
    const mount = (context: object) => { dispose = mountParentConversationAnnotations({
      ...context, locale: localeFixture('en').locale,
    } as never, () => {}, onOpen) }
    const fixture = officialUserTextFixture(order === 'before' ? mount : undefined)
    const errors = vi.fn()
    fixture.slots.onEntryError(errors)
    const before = fixture.slots.entries('conversation.chat.node')
    if (order === 'after') mount({ slots: fixture.slots, uiConversation: fixture.conversation })
    expect(fixture.slots.entries('conversation.chat.node')).toBe(before)
    const reference = webChatReferenceFixture()
    const text = `Before ${serializeWebChatReference(reference)} after.`
    const view = render(fixture.view(text))
    expect(screen.getByTestId('native-source')).toHaveTextContent('Native source decoration')
    expect(screen.getByRole('button', { name: 'Native message action' })).toBeInTheDocument()
    expect(screen.getByTestId('native-attachment')).toBeInTheDocument()
    expect(screen.getByTestId('native-text')).not.toHaveTextContent('readingInstructions')
    fireEvent.click(screen.getByRole('button', { name: 'Open Web Chat' }))
    expect(onOpen).toHaveBeenCalledOnce()
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining(reference))
    expect(errors).not.toHaveBeenCalled()
    view.rerender(fixture.view('Ordinary user message'))
    expect(screen.getByTestId('native-text')).toHaveTextContent('Ordinary user message')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByTestId('native-source')).toBeInTheDocument()
    await act(async () => { dispose(); await Promise.resolve() })
    view.rerender(fixture.view(text))
    expect(screen.getByTestId('native-source')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByTestId('native-text')).toHaveTextContent('readingInstructions')
    expect(fixture.slots.entries('conversation.chat.node')).toBe(before)
  })

  it('keeps readonly text summaries compact without exposing web-chat actions', () => {
    const fixture = officialUserTextFixture()
    const onOpen = vi.fn()
    const dispose = mountParentConversationAnnotations({
      slots: fixture.slots, uiConversation: fixture.conversation, locale: localeFixture('en').locale,
    } as never, () => {}, onOpen)
    const reference = webChatReferenceFixture()
    render(fixture.view(serializeWebChatReference(reference), false))
    expect(screen.getByText(reference.title)).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open Web Chat' })).not.toBeInTheDocument()
    expect(onOpen).not.toHaveBeenCalled()
    dispose()
  })

  it('consumes only valid reference spans and leaves unrelated native transformations intact', () => {
    const fixture = officialUserTextFixture()
    fixture.conversation.userText.register(parentReferenceTextRule)
    fixture.conversation.userText.register({ id: 'native-example', order: 10, match: (text, from) => {
      const start = text.indexOf('@native', from)
      return start < 0 ? undefined : { id: 'text', start, end: start + 7, data: { text: '@native', display: 'Native label' } }
    } })
    const wire = serializeWebChatReference(webChatReferenceFixture())
    const malformed = '<dsh_webchat_reference>broken</dsh_webchat_reference>'
    const text = `Before @native ${wire} between ${wire} ${malformed} after.`
    const nodes = fixture.evaluate({ text, facts: {} })
    expect(nodes.filter(node => node.id === PARENT_REFERENCE_TEXT_ID)).toHaveLength(2)
    expect(nodes.filter(node => node.id === PARENT_REFERENCE_TEXT_ID).map(node => text.slice(node.start, node.end))).toEqual([wire, wire])
    const visible = nodes.map(node => node.id === 'text' ? node.data.display ?? node.data.text : '[reference]').join('')
    expect(visible).toBe(`Before Native label [reference] between [reference] ${malformed} after.`)
  })

  it.each(['\n', '\r\n'])('decodes a legacy annotated question once without consuming surrounding native text (%j)', newline => {
    const fixture = officialUserTextFixture()
    fixture.conversation.userText.register(parentReferenceTextRule)
    const question = '<user_question>Literal &amp; text.</user_question>'
    const prompt = buildSideChatPrompt(selection, question)[0]!
    const text = ` \n${prompt.text}`.replaceAll('\n', newline)
    const nodes = fixture.evaluate({ text, facts: {} })
    expect(nodes.filter(node => node.id === PARENT_REFERENCE_TEXT_ID)).toHaveLength(1)
    expect(nodes.filter(node => node.id === 'text').map(node => node.data.display ?? node.data.text).join('').trim()).toBe(question)
    const ordinary = '<user_question>Keep &amp; literal XML</user_question>'
    expect(fixture.evaluate({ text: ordinary, facts: {} })).toEqual([{ id: 'text', start: 0, end: ordinary.length, data: { text: ordinary } }])
  })

  it('allows native reference matching inside a decoded legacy question', () => {
    const fixture = officialUserTextFixture()
    fixture.conversation.userText.register(parentReferenceTextRule)
    const wire = '@[Native thread](dsh-session:123)'
    const nativeMatch = vi.fn((text: string, from: number) => {
      const start = text.indexOf(wire, from)
      return start < 0 ? undefined : { id: 'text' as const, start, end: start + wire.length,
        data: { text: wire, display: '[native session chip]' } }
    })
    fixture.conversation.userText.register({ id: 'native-session-example', order: 10, match: nativeMatch })
    const question = `Explain ${wire} & keep <xml> and &amp; literal.`
    const prompt = buildSideChatPrompt(selection, question)[0]!
    const nodes = fixture.evaluate({ text: prompt.text, facts: {} })
    expect(nodes.some(node => node.id === 'text' && node.data.display === '[native session chip]')).toBe(true)
    const visible = nodes.filter(node => node.id === 'text').map(node => node.data.display ?? node.data.text).join('').trim()
    expect(visible).toBe('Explain [native session chip] & keep <xml> and &amp; literal.')
  })

  it.each(['Native & thread', 'Literal &amp; <thread>'])('decodes a legacy question wire label exactly once (%s)', label => {
    const fixture = officialUserTextFixture()
    const dispose = mountParentConversationAnnotations({
      slots: fixture.slots, uiConversation: fixture.conversation, locale: localeFixture('en').locale,
    } as never, () => {})
    const wire = `@[${label}](dsh-session:123)`
    const prompt = buildSideChatPrompt(selection, `Explain ${wire} & retain surrounding text.`)[0]!
    render(fixture.view(prompt.text))
    const chip = screen.getByText(label)
    expect(chip.closest('[title]')).toHaveAttribute('title', wire)
    const nodes = fixture.evaluate({ text: prompt.text, facts: {} })
    expect(nodes.some(node => node.id === PARENT_REFERENCE_TEXT_ID && node.data.kind === 'question-session'
      && node.data.label === label)).toBe(true)
    const ordinary = fixture.evaluate({ text: wire, facts: {} })
    expect(ordinary.every(node => node.id === 'text')).toBe(true)
    dispose()
  })

  it('preserves all malformed selection content surrounding an otherwise valid annotation', () => {
    const fixture = officialUserTextFixture()
    fixture.conversation.userText.register(parentReferenceTextRule)
    const malformed = '<selected_context>\nKEEP THIS\n<annotation>\n<selected_text>\nValid\n</selected_text>\n</annotation>\nKEEP THIS TOO\n</selected_context>'
    const question = '<user_question>Keep &amp; literal too</user_question>'
    const text = `${malformed}\n\n${question}`
    const nodes = fixture.evaluate({ text, facts: {} })
    expect(nodes.every(node => node.id === 'text')).toBe(true)
    expect(nodes.map(node => node.id === 'text' ? node.data.display ?? node.data.text : '').join('')).toBe(text)
  })

  it('keeps sent side-chat snapshots as labels and rejects malformed selection tags', () => {
    const fixture = officialUserTextFixture()
    const dispose = mountParentConversationAnnotations({
      slots: fixture.slots, uiConversation: fixture.conversation, locale: localeFixture('en').locale,
    } as never, () => {})
    const reference = { version: 1 as const, conversationId: 'discussion', title: 'Prior discussion',
      conversation: [{ role: 'user' as const, content: 'Hidden snapshot content' }] }
    const malformed = '<selected_context>not a valid annotation</selected_context>'
    render(fixture.view(`Before ${serializeReferencedConversation(reference)} ${malformed} after.`))
    expect(screen.getByText('Prior discussion')).toBeInTheDocument()
    expect(screen.getByTestId('native-text')).not.toHaveTextContent('Hidden snapshot content')
    expect(screen.getByTestId('native-text')).toHaveTextContent(malformed)
    dispose()
  })
})
