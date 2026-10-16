import type { WebChatReference } from '../../src/shared/webchat-reference.js'

export function webChatReferenceFixture(overrides: Partial<WebChatReference> = {}): WebChatReference {
  const referenceId = `sha256:${'a'.repeat(64)}`
  return {
    version: 1, referenceId, conversationId: 'chat-1', title: '方案比较',
    url: 'https://chat.deepseek.com/a/chat/s/chat-1', capturedAt: '2026-10-15T12:00:00.000Z',
    scope: 'rendered-current-branch', completeness: 'partial', messageCount: 8,
    preview: [{ id: 'answer-8', role: 'assistant', content: '结论：采用 A。\n\n```ts\nconst value = 3.24\n```' }],
    attachment: { attachmentId: referenceId as WebChatReference['attachment']['attachmentId'],
      name: 'webchat-chat-1.json', bytes: 4096 },
    ...overrides,
  }
}
