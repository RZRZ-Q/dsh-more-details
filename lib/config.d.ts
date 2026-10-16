import type { Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type WebChatLayout } from './shared/webchat-layout.js';
export interface Config {
    defaultPrompt: Volatile<string>;
    webChatLayout: Volatile<WebChatLayout>;
}
/** 保存时拒绝空白指令；Volatile 引用使下一次点击读取已保存的新值。 */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    defaultPrompt: z<string, string, "volatile-defined">;
    webChatLayout: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        width: z<number, number, "defined">;
        height: z<number, number, "defined">;
        expanded: z<boolean, boolean, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        width: z<number, number, "defined">;
        height: z<number, number, "defined">;
        expanded: z<boolean, boolean, "defined">;
    }>>>, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    defaultPrompt: z<string, string, "volatile-defined">;
    webChatLayout: z<NoInfer<Schemastery.ObjectS<NoInfer<{
        width: z<number, number, "defined">;
        height: z<number, number, "defined">;
        expanded: z<boolean, boolean, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        width: z<number, number, "defined">;
        height: z<number, number, "defined">;
        expanded: z<boolean, boolean, "defined">;
    }>>>, "volatile-defined">;
}>>, "plain">;
