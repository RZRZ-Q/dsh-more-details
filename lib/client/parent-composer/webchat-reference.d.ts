import type { ReactNode } from 'react';
import { type DshLocale } from '../dsh/locale.js';
import { type WebChatReference } from '../../shared/webchat-reference.js';
import { type ParentComposerInput, type ParentComposerInputSnapshot, type SelectionReferenceSource } from './composer-reference.js';
export declare const WEBCHAT_REFERENCE_SOURCE = "dsh-more-details-webchat";
export type OpenWebChatReference = (reference: WebChatReference) => void;
export declare function webChatReferences(snapshot: ParentComposerInputSnapshot): readonly WebChatReference[];
/** 只更新未发送草稿内同一网页的引用，已发送消息中的快照保持不变。 */
export declare function addWebChatReference(input: ParentComposerInput, reference: WebChatReference, onCommitted?: () => void): boolean;
/** 草稿 chip 使用 DSH 官方 openReference 钩子，避免伪装成 DSH Session ID。 */
export declare function createWebChatReferenceSource(onOpen: OpenWebChatReference, locale: DshLocale): SelectionReferenceSource;
export declare function WebChatReferenceCard({ reference, onOpen, locale }: {
    readonly reference: WebChatReference;
    readonly onOpen?: OpenWebChatReference;
    readonly locale: DshLocale;
}): ReactNode;
export declare function WebChatDraftReferences({ input, onOpen, locale }: {
    readonly input: ParentComposerInputSnapshot;
    readonly onOpen?: OpenWebChatReference;
    readonly locale: DshLocale;
}): ReactNode;
