import type { Context } from '@deepseek-ai/cordis';
import { WebChatReferenceStore } from './webchat-reference-store.js';
export declare function registerWebChatReferenceTool(ctx: Context, store: WebChatReferenceStore): () => void;
