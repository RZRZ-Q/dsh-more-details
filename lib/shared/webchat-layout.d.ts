/** 放大时仍保留用户自定义尺寸，供还原和下次启动恢复。 */
export interface WebChatLayout {
    readonly width: number;
    readonly height: number;
    readonly expanded: boolean;
}
export declare const DEFAULT_WEBCHAT_LAYOUT: WebChatLayout;
