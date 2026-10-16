import { useId, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { DEFAULT_MORE_DETAILS_PROMPT } from '../../shared/more-details.js'

interface MoreDetailsPreferences {
  readonly defaultPrompt: string
}

interface MoreDetailsSettingsInjected {
  readonly hooks: { readonly promptSettings: ConfigForm<MoreDetailsPreferences> }
  readonly savePrompt: (prompt: string) => Promise<boolean>
  readonly resetPrompt: () => Promise<boolean>
}

export type MoreDetailsSettingsProps = PropsRuntime<'settings.general.item'>
  & InjectFace<MoreDetailsSettingsInjected>

const styles = `
.dsh-more-details-settings { display: grid; gap: 10px; padding: 16px 0; color: var(--dsw-alias-label-primary, inherit); }
.dsh-more-details-settings h3, .dsh-more-details-settings p { margin: 0; }
.dsh-more-details-settings h3 { font-size: 15px; font-weight: 600; }
.dsh-more-details-settings p { font-size: 13px; line-height: 1.6; }
.dsh-more-details-settings textarea { box-sizing: border-box; width: 100%; min-height: 132px; padding: 10px 12px; resize: vertical; border: 1px solid var(--dsw-alias-border-l2, #aaa); border-radius: 10px; background: var(--dsw-alias-bg-layer-2, transparent); color: inherit; font: inherit; line-height: 1.6; }
.dsh-more-details-settings-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.dsh-more-details-settings button { padding: 7px 14px; border: 1px solid var(--dsw-alias-border-l2, #aaa); border-radius: 8px; background: var(--dsw-alias-bg-layer-2, transparent); color: inherit; font: inherit; cursor: pointer; }
.dsh-more-details-settings button[type=submit] { background: var(--dsw-alias-button-info-fill, #4176e6); color: var(--dsw-alias-label-primary-foreground, #fff); border-color: transparent; }
.dsh-more-details-settings button:disabled, .dsh-more-details-settings textarea:disabled { opacity: .55; cursor: not-allowed; }
.dsh-more-details-settings :is(button, textarea):focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #1473e6); outline-offset: 2px; }
.dsh-more-details-settings [role=alert] { color: var(--dsw-alias-state-error-primary, #b42318); }
`

/** 默认提示词的编辑草稿只属于表单，保存值由 DSH 的 ConfigForm 持有。 */
export function MoreDetailsSettings({ usePromptSettings, savePrompt, resetPrompt }: Pick<MoreDetailsSettingsProps, 'usePromptSettings' | 'savePrompt' | 'resetPrompt'>) {
  const settings = usePromptSettings(snapshot => snapshot)
  const id = useId()
  const savedPrompt = settings.value?.defaultPrompt ?? DEFAULT_MORE_DETAILS_PROMPT
  const [draft, setDraft] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<{ readonly error: boolean; readonly text: string } | null>(null)
  const value = draft ?? savedPrompt
  // alpha.4 的配置表单只提供 Host 数据；rc.2 仍需排除不持久化的 memory 模式。
  const persistent = !('mode' in settings) || settings.mode === 'host'
  const writable = settings.status === 'ready' && persistent && settings.writable
  const dirty = draft !== null && draft !== savedPrompt
  const blank = value.trim() === ''
  const availability = settings.status === 'loading'
    ? '正在读取已保存的提示词…'
    : !persistent
      ? '当前连接不支持持久保存，请在本机 DSH 中修改此设置。'
      : settings.status !== 'ready'
        ? '当前连接未提供“更多详情”配置，请确认插件已启用。'
        : !settings.writable
          ? '当前 DSH 配置只读，无法保存修改。'
          : null

  const persist = async (reset: boolean): Promise<void> => {
    if (pending || !writable || (!reset && (!dirty || blank))) return
    setPending(true)
    setNotice(null)
    try {
      const accepted = await (reset ? resetPrompt() : savePrompt(value))
      if (!accepted) {
        setNotice({ error: true, text: '未能保存：配置可能已变化或不允许写入。编辑内容已保留，请重试。' })
        return
      }
      setDraft(null)
      setNotice({ error: false, text: reset ? '已恢复默认提示词。' : '提示词已保存，下次点击“更多详情”时生效。' })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      setNotice({ error: true, text: `未能保存：${detail}。编辑内容已保留。` })
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="dsh-more-details-settings" aria-labelledby={`${id}-title`}
      onSubmit={event => { event.preventDefault(); void persist(false) }}>
      <style>{styles}</style>
      <h3 id={`${id}-title`}>更多详情</h3>
      <p id={`${id}-description`}>划词后点击“更多详情”，会在右下角 DeepSeek 网页聊天中自动发送以下提示词；选文和来源背景会自动附加。</p>
      <label htmlFor={id}>默认提示词</label>
      <textarea id={id} rows={5} value={value} disabled={!writable || pending}
        aria-describedby={`${id}-description${blank ? ` ${id}-validation` : ''}`}
        onChange={event => { setDraft(event.currentTarget.value); setNotice(null) }} />
      {blank && <p id={`${id}-validation`}>请输入非空的提示词。</p>}
      {availability !== null && <p role="status">{availability}</p>}
      <div className="dsh-more-details-settings-actions">
        <button type="submit" disabled={!writable || pending || !dirty || blank}>{pending ? '正在保存…' : '保存'}</button>
        <button type="button" disabled={!writable || pending} onClick={() => { void persist(true) }}>恢复默认</button>
      </div>
      {notice !== null && <p role={notice.error ? 'alert' : 'status'}>{notice.text}</p>}
    </form>
  )
}

/** 在通用设置中挂载一个配置区块；返回值随插件卸载移除 Slot。 */
export function mountMoreDetailsSettings(ctx: Context): () => void {
  const form = ctx.configForms.get<MoreDetailsPreferences>('more-details')
  return ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'more-details-prompt',
    order: 90,
    inject: (): MoreDetailsSettingsInjected => ({
      hooks: { promptSettings: form },
      savePrompt: prompt => form.set('defaultPrompt', prompt),
      resetPrompt: () => form.unset('defaultPrompt'),
    }),
  }, MoreDetailsSettings))
}
