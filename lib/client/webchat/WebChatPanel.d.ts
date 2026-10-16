import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
import { type DshLocale } from '../dsh/locale.js';
import { type WebChatLayout } from '../../shared/webchat-layout.js';
import type { WebChatController } from './controller.js';
import type { DeepSeekGuest } from './guest.js';
interface PromptPreferences {
    readonly defaultPrompt: string;
}
export interface WebChatPreferences extends PromptPreferences {
    readonly webChatLayout: WebChatLayout;
}
export interface WebChatPanelProps {
    readonly controller: WebChatController;
    readonly guest: DeepSeekGuest;
    readonly form: ConfigForm<WebChatPreferences>;
    readonly locale: DshLocale;
}
/** 容器始终挂载；切换页面与收起只改变可见性，保留原生 guest 的登录和会话。 */
export declare function WebChatPanel({ controller, guest, form, locale }: WebChatPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
