import type { SideChatPhase } from '../../shared/contracts.js'
import type { SideChatMessages } from './messages.js'

function AddToConversationIcon() {
  return (
    <svg
      className="dsh-more-details-add-to-conversation-icon"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path d="M4.25 4.5h11.5v8.25H9l-3.5 2.75v-2.75H4.25z" />
      <path d="M10 6.5v4M8 8.5h4" />
    </svg>
  )
}

export function SideChatHeader({
  phase,
  messages,
  addToConversationDisabled = false,
  onAddToConversation,
  onFocusParent,
  onClose,
}: {
  readonly phase: SideChatPhase
  readonly messages: SideChatMessages
  readonly addToConversationDisabled?: boolean
  readonly onAddToConversation?: () => void
  readonly onFocusParent: () => void
  readonly onClose: () => void
}) {
  return (
    <header className="dsh-more-details-header">
      <button type="button" className="dsh-more-details-heading" onClick={onFocusParent}>
        <strong>{messages.title}</strong>
      </button>
      <div className="dsh-more-details-header-actions">
        {onAddToConversation !== undefined && (
          <button
            type="button"
            className="dsh-more-details-add-to-conversation"
            disabled={addToConversationDisabled}
            onClick={onAddToConversation}
          >
            <AddToConversationIcon />
            <span>{messages.addToConversation}</span>
          </button>
        )}
        <button
          type="button"
          className="dsh-more-details-close"
          aria-label={messages.close}
          disabled={phase === 'closing'}
          onClick={onClose}
        >×</button>
      </div>
    </header>
  )
}
