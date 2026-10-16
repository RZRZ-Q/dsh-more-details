import type { WebChatCapture } from '../../shared/webchat-reference.js';
export type DeepSeekCaptureResult = {
    ok: true;
    capture: WebChatCapture;
} | {
    ok: false;
    reason: string;
};
export declare function deepSeekCaptureScript(expectedUrl: string): string;
