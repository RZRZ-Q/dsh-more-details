import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useState } from 'react';
import { DEFAULT_MORE_DETAILS_PROMPT } from '../../shared/more-details.js';
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
`;
/** 默认提示词的编辑草稿只属于表单，保存值由 DSH 的 ConfigForm 持有。 */
export function MoreDetailsSettings({ usePromptSettings, savePrompt, resetPrompt }) {
    const settings = usePromptSettings(snapshot => snapshot);
    const id = useId();
    const savedPrompt = settings.value?.defaultPrompt ?? DEFAULT_MORE_DETAILS_PROMPT;
    const [draft, setDraft] = useState(null);
    const [pending, setPending] = useState(false);
    const [notice, setNotice] = useState(null);
    const value = draft ?? savedPrompt;
    const writable = settings.status === 'ready' && settings.mode === 'host' && settings.writable;
    const dirty = draft !== null && draft !== savedPrompt;
    const blank = value.trim() === '';
    const availability = settings.status === 'loading'
        ? '正在读取已保存的提示词…'
        : settings.mode !== 'host'
            ? '当前连接不支持持久保存，请在本机 DSH 中修改此设置。'
            : settings.status !== 'ready'
                ? '当前连接未提供“更多详情”配置，请确认插件已启用。'
                : !settings.writable
                    ? '当前 DSH 配置只读，无法保存修改。'
                    : null;
    const persist = async (reset) => {
        if (pending || !writable || (!reset && (!dirty || blank)))
            return;
        setPending(true);
        setNotice(null);
        try {
            const accepted = await (reset ? resetPrompt() : savePrompt(value));
            if (!accepted) {
                setNotice({ error: true, text: '未能保存：配置可能已变化或不允许写入。编辑内容已保留，请重试。' });
                return;
            }
            setDraft(null);
            setNotice({ error: false, text: reset ? '已恢复默认提示词。' : '提示词已保存，下次点击“更多详情”时生效。' });
        }
        catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            setNotice({ error: true, text: `未能保存：${detail}。编辑内容已保留。` });
        }
        finally {
            setPending(false);
        }
    };
    return (_jsxs("form", { className: "dsh-more-details-settings", "aria-labelledby": `${id}-title`, onSubmit: event => { event.preventDefault(); void persist(false); }, children: [_jsx("style", { children: styles }), _jsx("h3", { id: `${id}-title`, children: "\u66F4\u591A\u8BE6\u60C5" }), _jsx("p", { id: `${id}-description`, children: "\u5212\u8BCD\u540E\u70B9\u51FB\u201C\u66F4\u591A\u8BE6\u60C5\u201D\uFF0C\u4F1A\u5728\u53F3\u4E0B\u89D2 DeepSeek \u7F51\u9875\u804A\u5929\u4E2D\u81EA\u52A8\u53D1\u9001\u4EE5\u4E0B\u63D0\u793A\u8BCD\uFF1B\u9009\u6587\u548C\u6765\u6E90\u80CC\u666F\u4F1A\u81EA\u52A8\u9644\u52A0\u3002" }), _jsx("label", { htmlFor: id, children: "\u9ED8\u8BA4\u63D0\u793A\u8BCD" }), _jsx("textarea", { id: id, rows: 5, value: value, disabled: !writable || pending, "aria-describedby": `${id}-description${blank ? ` ${id}-validation` : ''}`, onChange: event => { setDraft(event.currentTarget.value); setNotice(null); } }), blank && _jsx("p", { id: `${id}-validation`, children: "\u8BF7\u8F93\u5165\u975E\u7A7A\u7684\u63D0\u793A\u8BCD\u3002" }), availability !== null && _jsx("p", { role: "status", children: availability }), _jsxs("div", { className: "dsh-more-details-settings-actions", children: [_jsx("button", { type: "submit", disabled: !writable || pending || !dirty || blank, children: pending ? '正在保存…' : '保存' }), _jsx("button", { type: "button", disabled: !writable || pending, onClick: () => { void persist(true); }, children: "\u6062\u590D\u9ED8\u8BA4" })] }), notice !== null && _jsx("p", { role: notice.error ? 'alert' : 'status', children: notice.text })] }));
}
/** 在通用设置中挂载一个配置区块；返回值随插件卸载移除 Slot。 */
export function mountMoreDetailsSettings(ctx) {
    const form = ctx.configForms.get('more-details');
    return ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'more-details-prompt',
        order: 90,
        inject: () => ({
            hooks: { promptSettings: form },
            savePrompt: prompt => form.set('defaultPrompt', prompt),
            resetPrompt: () => form.unset('defaultPrompt'),
        }),
    }, MoreDetailsSettings));
}
