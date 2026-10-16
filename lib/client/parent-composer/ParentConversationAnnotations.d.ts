import { type ElementType, type ReactNode } from 'react';
import type { DshClientContext } from '../dsh/context.js';
import { type DshLocale } from '../dsh/locale.js';
import { SessionId } from '../../shared/contracts.js';
import { type ParentComposerInputSnapshot } from './add-to-conversation.js';
import { type OpenWebChatReference } from './webchat-reference.js';
interface UserNodeProps {
    readonly node: {
        readonly data: {
            readonly content: readonly unknown[];
            readonly referenceLabels?: readonly string[];
            readonly [key: string]: unknown;
        };
        readonly [key: string]: unknown;
    };
    readonly [key: string]: unknown;
}
type UserNodeRenderer = ElementType<UserNodeProps>;
/** The interactive annotation capsule occupying the reserved first composer row. */
export declare function ParentComposerAnnotations({ input, onRemove, locale, }: {
    readonly input: ParentComposerInputSnapshot;
    readonly onRemove: () => void;
    readonly locale: DshLocale;
}): import("react/jsx-runtime").JSX.Element | null;
/** Wrap DSH's own user renderer only when this plugin's durable prefix exists. */
export declare function annotatedUserMessageRenderer(Original: UserNodeRenderer, locale: DshLocale, onOpenWebChat?: OpenWebChatReference): (props: UserNodeProps) => ReactNode;
/** Mount the composer capsule and a thin wrapper around DSH's user renderers. */
export declare function mountParentConversationAnnotations(ctx: DshClientContext, removeAnnotations: (sessionId: SessionId) => void, onOpenWebChat?: OpenWebChatReference): () => void;
export {};
