import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import * as cordis from '@deepseek-ai/cordis'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import * as store from '@deepseek-ai/dsh-client-store'
import * as slotCore from '@deepseek-ai/dsh-client-ui-slots'
import * as react from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import * as reactDom from 'react-dom'
import * as reactDomClient from 'react-dom/client'
import * as zod from 'zod'
import type { UserTextNode, UiConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { onTestFinished } from 'vitest'

const dependencies: Record<string, unknown> = {
  '@deepseek-ai/cordis': cordis,
  '@deepseek-ai/dsh-client-ui-primitives': primitives,
  '@deepseek-ai/dsh-client-store': store,
  '@deepseek-ai/dsh-client-ui-slots': slotCore,
  react, 'react/jsx-runtime': jsxRuntime, 'react-dom': reactDom, 'react-dom/client': reactDomClient, zod,
}

/** 执行 npm 包的原始浏览器模块，复用真实 evaluator 和 Slot renderer。 */
function officialClient<T>(id: string): T {
  let result: T | undefined
  const code = readFileSync(createRequire(import.meta.url).resolve(`${id}/client`), 'utf8')
  const browser = { __ModuleLoader__: { load: (definition: { factory: (require: (name: string) => unknown) => T }) => {
    result = definition.factory((name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected official dependency: ${name}`)
      return dependencies[name]
    })
  } } }
  new Function('window', code)(browser)
  if (result === undefined) throw new Error(`Official browser module did not load: ${id}`)
  return result
}

type Slots = Pick<SlotRegistry, 'register' | 'installScope' | 'inject' | 'renderSlot' | 'entries' | 'onEntryError'>
type RenderSeats = {
  readonly renderSlot: (key: string, owner: object, options?: { entryKey?: string; fallback?: react.ReactNode }) => react.ReactNode
  readonly renderSlotChain: (key: string, owner: object, options?: { fallback?: react.ReactNode }) => react.ReactNode
}

/** 最小会话 seat；匹配、slot 注入、来源 chain 和卸载均走官方实现。 */
export function officialUserTextFixture(beforeDeclaration?: (context: {
  slots: Slots; uiConversation: UiConversation
}) => void) {
  const ctx = new cordis.Context()
  onTestFinished(async () => { await ctx.fiber.dispose() })
  const renderer = officialClient<typeof import('@deepseek-ai/dsh-client-ui-renderer/client')>('@deepseek-ai/dsh-client-ui-renderer')
  renderer.apply(ctx)
  const { UiConversation: Conversation } = officialClient<{ UiConversation: typeof UiConversation }>('@deepseek-ai/dsh-client-ui-conversation')
  const conversation = new Conversation(ctx, {} as never)
  const slots: Slots = ctx.slots
  const binding = { key: 'test-session', ctx, hooks: {}, keyedHooks: {}, props: {} }
  const observable = { getSnapshot: () => binding, subscribe: () => () => {} }
  slots.installScope('session', { current: observable, bindingSource: () => observable,
    renderArea: (_binding, props) => props.children })
  let sourceText = ''
  let interactive = true
  const evaluate = conversation.userText.createEvaluator()
  const NativeMessage = ({ renderSlot, renderSlotChain }: RenderSeats) => <div data-testid="native-message">
    {renderSlotChain('conversation.chat.user.before', { source: 'native-source' }, { fallback: null })}
    <div data-testid="native-text">{evaluate({ text: sourceText, facts: {} }).map((node: UserTextNode) => <react.Fragment key={`${node.id}:${node.start}`}>
      {renderSlot('conversation.user.text.node', { node, raw: sourceText.slice(node.start, node.end), interactive }, {
        entryKey: node.id, fallback: node.id === 'text' ? node.data.display ?? node.data.text : sourceText.slice(node.start, node.end),
      })}
    </react.Fragment>)}</div>
    <button type="button">Native message action</button>
    <span data-testid="native-attachment">attachment</span>
  </div>
  beforeDeclaration?.({ slots, uiConversation: conversation })
  slots.register({ name: 'root', children: {
    'conversation.chat.node': { kind: 'keyed', scope: 'session' },
    'conversation.input.dock': { kind: 'list', scope: 'session' },
  } } as never, (({ renderSlot }: RenderSeats) => renderSlot('conversation.chat.node', {}, { entryKey: 'user' })) as never)
  slots.register({ name: 'conversation.chat.node', key: 'user', children: {
    'conversation.chat.user.before': { kind: 'chain', scope: 'session' },
    'conversation.user.text.node': { kind: 'keyed', scope: 'session', inline: true },
  } } as never, NativeMessage as never)
  slots.register({ name: 'conversation.chat.user.before', select: () => ({ source: 'native-source' }) } as never,
    (() => <span data-testid="native-source">Native source decoration</span>) as never)
  return { ctx, slots, conversation, evaluate, NativeMessage,
    view: (text: string, allowActions = true) => { sourceText = text; interactive = allowActions; return slots.renderSlot('root', {}) } }
}
