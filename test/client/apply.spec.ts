// @vitest-environment jsdom
import type { ReactElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../../src/client/apply.js'
import type { SelectionReferenceSource } from '../../src/client/parent-composer/composer-reference.js'
import { localeFixture } from '../fixtures/locale.js'

// 仅替代宿主 RPC 和注册边界；执行真实 apply、guest/controller 与引用 codec。
vi.mock('../../src/client/dsh/remote-adapter.js', () => ({
  mountSideChatRemote: async () => ({ remote: {}, loginStore: {}, dispose: () => {},
    prepareDetails: vi.fn(), saveWebChatReference: vi.fn() }),
}))
vi.mock('../../src/client/dsh/MoreDetailsSettings.js', () => ({ mountMoreDetailsSettings: () => () => {} }))
vi.mock('../../src/client/parent-composer/ParentConversationAnnotations.js', () => ({
  mountParentConversationAnnotations: () => () => {},
}))

afterEach(() => { vi.unstubAllGlobals() })

describe('Web / Desktop client entry registration', () => {
  it.each([false, true])('keeps selection and reference services with desktop=%s', async (desktop) => {
    const acquire = vi.fn()
    vi.stubGlobal('dshDesktop', desktop ? { protocolVersion: 1,
      browser: { acquire, release: vi.fn(), onOpenRequested: vi.fn() } } : undefined)
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() }
    vi.stubGlobal('localStorage', storage)
    const slots = new Map<string, ReactElement<{ webChatAvailable: boolean }>>()
    const sources = new Map<string, SelectionReferenceSource>()
    let dispose: (() => Promise<void>) | undefined
    const context = {
      effect: (setup: () => () => Promise<void>) => { dispose = setup() },
      locale: localeFixture('en').locale,
      sessions: { list: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} } },
      configForms: { get: () => ({}) },
      inputTriggers: { registerSource: (source: SelectionReferenceSource) => {
        sources.set(source.name, source); return () => { sources.delete(source.name) }
      } },
      slots: {
        inject: (_name: string, setup: () => () => void) => setup(),
        register: ({ id }: { id: string }, render: (props: { wide: boolean }) => ReactElement<{ webChatAvailable: boolean }>) => {
          slots.set(id, render({ wide: true })); return () => { slots.delete(id) }
        },
      },
    }
    await apply(context as unknown as Context)
    expect(slots.has('dsh-more-details-new-chat')).toBe(desktop)
    expect(slots.has('dsh-more-details-continue-chat')).toBe(desktop)
    expect(slots.has('dsh-more-details-webchat')).toBe(desktop)
    expect(slots.get('dsh-more-details')?.props.webChatAvailable).toBe(desktop)
    expect(sources.size).toBe(3)
    expect(typeof sources.get('dsh-more-details-webchat')?.openReference).toBe(desktop ? 'function' : 'undefined')
    expect(acquire).not.toHaveBeenCalled()
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(storage.removeItem).not.toHaveBeenCalled()
    await dispose?.()
    expect(slots.size).toBe(0)
    expect(sources.size).toBe(0)
  })
})
