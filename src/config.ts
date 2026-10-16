import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { DEFAULT_MORE_DETAILS_PROMPT } from './shared/more-details.js'
import { DEFAULT_WEBCHAT_LAYOUT, type WebChatLayout } from './shared/webchat-layout.js'

export interface Config {
  defaultPrompt: Volatile<string>
  webChatLayout: Volatile<WebChatLayout>
}

/** 保存时拒绝空白指令；Volatile 引用使下一次点击读取已保存的新值。 */
export const Config = z.object({
  defaultPrompt: z.string().pattern(/\S/u).default(DEFAULT_MORE_DETAILS_PROMPT).volatile(),
  webChatLayout: z.object({
    width: z.number().min(1).required(),
    height: z.number().min(1).required(),
    expanded: z.boolean().required(),
  }).default(DEFAULT_WEBCHAT_LAYOUT).volatile(),
})
