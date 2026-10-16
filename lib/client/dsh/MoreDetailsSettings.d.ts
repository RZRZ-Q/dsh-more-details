import type { Context } from '@deepseek-ai/cordis';
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
interface MoreDetailsPreferences {
    readonly defaultPrompt: string;
}
interface MoreDetailsSettingsInjected {
    readonly hooks: {
        readonly promptSettings: ConfigForm<MoreDetailsPreferences>;
    };
    readonly savePrompt: (prompt: string) => Promise<boolean>;
    readonly resetPrompt: () => Promise<boolean>;
}
export type MoreDetailsSettingsProps = PropsRuntime<'settings.general.item'> & InjectFace<MoreDetailsSettingsInjected>;
/** 默认提示词的编辑草稿只属于表单，保存值由 DSH 的 ConfigForm 持有。 */
export declare function MoreDetailsSettings({ usePromptSettings, savePrompt, resetPrompt }: Pick<MoreDetailsSettingsProps, 'usePromptSettings' | 'savePrompt' | 'resetPrompt'>): import("react/jsx-runtime").JSX.Element;
/** 在通用设置中挂载一个配置区块；返回值随插件卸载移除 Slot。 */
export declare function mountMoreDetailsSettings(ctx: Context): () => void;
export {};
