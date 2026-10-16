import type { SessionId } from '../../shared/contracts.js';
import { type ParentComposerInput } from './composer-reference.js';
interface ReferenceStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
/** Recover the complete reference-bearing draft, not only a leading annotation.
 * DSH persists clipboard text, so conversation chips need recovery as well. */
export declare class ConversationAnnotationPersistence {
    private readonly storage;
    private readonly persistentStorage;
    private readonly observedInputs;
    private readonly restoringWebInputs;
    private reconciling;
    constructor(storage?: ReferenceStorage | undefined, persistentStorage?: ReferenceStorage | undefined);
    reconcile(sessionId: SessionId, input: ParentComposerInput): void | Promise<void>;
    private restoreWebDraft;
    private restore;
}
export {};
