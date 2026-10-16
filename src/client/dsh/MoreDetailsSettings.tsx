import { useId, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { DEFAULT_MORE_DETAILS_PROMPT } from '../../shared/more-details.js'
import { useDshLocale, type DshLocale } from './locale.js'

interface MoreDetailsPreferences {
  readonly defaultPrompt: string
}

interface MoreDetailsSettingsInjected {
  readonly locale: DshLocale
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
export function MoreDetailsSettings({ locale, usePromptSettings, savePrompt, resetPrompt }: Pick<MoreDetailsSettingsProps, 'locale' | 'usePromptSettings' | 'savePrompt' | 'resetPrompt'>) {
  const { text } = useDshLocale(locale)
  const settings = usePromptSettings(snapshot => snapshot)
  const id = useId()
  const savedPrompt = settings.value?.defaultPrompt ?? DEFAULT_MORE_DETAILS_PROMPT
  const [draft, setDraft] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<
    | { readonly kind: 'rejected' | 'saved' | 'reset' }
    | { readonly kind: 'failed'; readonly detail: string }
    | null
  >(null)
  const value = draft ?? savedPrompt
  // alpha.4 的配置表单只提供 Host 数据；rc.2 仍需排除不持久化的 memory 模式。
  const persistent = !('mode' in settings) || settings.mode === 'host'
  const writable = settings.status === 'ready' && persistent && settings.writable
  const dirty = draft !== null && draft !== savedPrompt
  const blank = value.trim() === ''
  const availability = settings.status === 'loading'
    ? text('正在读取已保存的提示词…', 'Loading the saved prompt…')
    : !persistent
      ? text('当前连接不支持持久保存，请在本机 DSH 中修改此设置。', 'This connection cannot save settings permanently. Change this setting in your local DSH app.')
      : settings.status !== 'ready'
        ? text('当前连接未提供“更多详情”配置，请确认插件已启用。', 'More details settings are unavailable on this connection. Check that the plugin is enabled.')
        : !settings.writable
          ? text('当前 DSH 配置只读，无法保存修改。', 'DSH settings are read-only. Changes cannot be saved.')
          : null
  const noticeText = notice === null ? null : notice.kind === 'failed'
    ? text(`未能保存：${notice.detail}。编辑内容已保留。`, `Could not save: ${notice.detail}. Your edits have been kept.`)
    : {
        rejected: text('未能保存：配置可能已变化或不允许写入。编辑内容已保留，请重试。', 'Could not save: settings may have changed or may not be writable. Your edits have been kept. Please retry.'),
        saved: text('提示词已保存，下次点击“更多详情”时生效。', 'Prompt saved. It will be used the next time you select More details.'),
        reset: text('已恢复默认提示词。', 'Default prompt restored.'),
      }[notice.kind]

  const persist = async (reset: boolean): Promise<void> => {
    if (pending || !writable || (!reset && (!dirty || blank))) return
    setPending(true)
    setNotice(null)
    try {
      const accepted = await (reset ? resetPrompt() : savePrompt(value))
      if (!accepted) {
        setNotice({ kind: 'rejected' })
        return
      }
      setDraft(null)
      setNotice({ kind: reset ? 'reset' : 'saved' })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      setNotice({ kind: 'failed', detail })
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="dsh-more-details-settings" aria-labelledby={`${id}-title`}
      onSubmit={event => { event.preventDefault(); void persist(false) }}>
      <style>{styles}</style>
      <h3 id={`${id}-title`}>{text('更多详情', 'More details')}</h3>
      <p id={`${id}-description`}>{text('划词后点击“更多详情”，会在右下角 DeepSeek 网页聊天中自动发送以下提示词；选文和来源背景会自动附加。', 'Select text and choose More details to send this prompt in the bottom-right DeepSeek Web Chat. The selection and source context are included automatically.')}</p>
      <label htmlFor={id}>{text('默认提示词', 'Default prompt')}</label>
      <textarea id={id} rows={5} value={value} disabled={!writable || pending}
        aria-describedby={`${id}-description${blank ? ` ${id}-validation` : ''}`}
        onChange={event => { setDraft(event.currentTarget.value); setNotice(null) }} />
      {blank && <p id={`${id}-validation`}>{text('请输入非空的提示词。', 'Enter a prompt that is not blank.')}</p>}
      {availability !== null && <p role="status">{availability}</p>}
      <div className="dsh-more-details-settings-actions">
        <button type="submit" disabled={!writable || pending || !dirty || blank}>{pending ? text('正在保存…', 'Saving…') : text('保存', 'Save')}</button>
        <button type="button" disabled={!writable || pending} onClick={() => { void persist(true) }}>{text('恢复默认', 'Restore default')}</button>
      </div>
      {notice !== null && <p role={notice.kind === 'rejected' || notice.kind === 'failed' ? 'alert' : 'status'}>{noticeText}</p>}
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
      locale: ctx.locale,
      hooks: { promptSettings: form },
      savePrompt: prompt => form.set('defaultPrompt', prompt),
      resetPrompt: () => form.unset('defaultPrompt'),
    }),
  }, MoreDetailsSettings))
}
