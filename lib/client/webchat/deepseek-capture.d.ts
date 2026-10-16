import type { WebChatCapture } from '../../shared/webchat-reference.js';
import type { WebChatMessage } from './messages.js';
export type DeepSeekCaptureResult = {
    ok: true;
    capture: WebChatCapture;
} | {
    ok: false;
    reason: WebChatMessage;
};
export declare function deepSeekCaptureScript(expectedUrl: string): string;
