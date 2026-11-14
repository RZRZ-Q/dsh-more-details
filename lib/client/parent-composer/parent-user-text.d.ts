import type { ReactNode } from 'react';
import type { UserTextNode, UserTextRule } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { DshLocale } from '../dsh/locale.js';
import { type ConversationAnnotation } from './add-to-conversation.js';
import { type ReferencedSideChatConversation } from './referenced-conversation.js';
import { type OpenWebChatReference } from './webchat-reference.js';
import { type WebChatReference } from '../../shared/webchat-reference.js';
export declare const PARENT_REFERENCE_TEXT_ID = "dsh-more-details-reference";
type ReferenceTextData = {
    readonly kind: 'web';
    readonly reference: WebChatReference;
} | {
    readonly kind: 'selection';
    readonly annotations: readonly ConversationAnnotation[];
} | {
    readonly kind: 'side-chat';
    readonly reference: ReferencedSideChatConversation;
} | {
    readonly kind: 'question-session';
    readonly label: string;
    readonly title: string;
};
declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
    interface UserTextDataMap {
        'dsh-more-details-reference': ReferenceTextData;
    }
}
export declare const parentReferenceTextRule: UserTextRule<typeof PARENT_REFERENCE_TEXT_ID>;
export declare function ParentReferenceText({ node, interactive, locale, onOpenWebChat }: {
    readonly node: UserTextNode<typeof PARENT_REFERENCE_TEXT_ID>;
    readonly interactive: boolean;
    readonly locale: DshLocale;
    readonly onOpenWebChat?: OpenWebChatReference;
}): ReactNode;
export {};
