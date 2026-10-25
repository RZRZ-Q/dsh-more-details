import type { SideChatController } from '../side-chat-controller.js';
import { DshSideChatSessions } from './sessions-adapter.js';
import { type DshLocale } from './locale.js';
import type { WebChatController } from '../webchat/controller.js';
/** Selection toolbar and plugin-owned read-only discussion panel. */
export declare function SideChatOverlay({ controller, sessions, details, webChatAvailable, locale: localeService, }: {
    readonly locale: DshLocale;
    readonly details: Pick<WebChatController, 'subscribe' | 'getSnapshot' | 'start'>;
    readonly webChatAvailable?: boolean;
    readonly controller: SideChatController;
    readonly sessions: DshSideChatSessions;
}): import("react/jsx-runtime").JSX.Element;
