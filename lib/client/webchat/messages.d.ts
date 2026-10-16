import type { Localize } from '../dsh/locale.js';
/** 保存两种文案而非当前译文，使正在显示的状态也能跟随 DSH 切换语言。 */
export type WebChatMessage = string | {
    readonly zh: string;
    readonly en: string;
};
export declare function renderWebChatMessage(message: WebChatMessage, text: Localize): string;
export declare class WebChatMessageError extends Error {
    readonly localizedMessage: WebChatMessage;
    constructor(localizedMessage: WebChatMessage);
}
/** 外部错误诊断不翻译；插件自有错误保留双语，交由 UI 决定当前显示语言。 */
export declare function webChatErrorMessage(error: unknown): WebChatMessage;
/** 仅翻译 prepare/save 的既有 Host 文案，保持 RPC 和错误诊断契约不变。 */
export declare function webChatHostMessage(message: string): WebChatMessage;
