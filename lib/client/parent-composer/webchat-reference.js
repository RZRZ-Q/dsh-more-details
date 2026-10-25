import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useDshLocale } from '../dsh/locale.js';
import { isWebChatReference, serializeWebChatReference, } from '../../shared/webchat-reference.js';
import { editComposerWithCommit, occurrenceEditSpan, } from './composer-reference.js';
export const WEBCHAT_REFERENCE_SOURCE = 'dsh-more-details-webchat';
function decodeReference(ref, invalidMessage = 'Invalid web discussion reference') {
    let value;
    try {
        value = JSON.parse(ref);
    }
    catch {
        throw new Error(invalidMessage);
    }
    if (!isWebChatReference(value))
        throw new Error(invalidMessage);
    return value;
}
export function webChatReferences(snapshot) {
    return snapshot.occurrences.flatMap((occurrence) => {
        if (occurrence.source !== WEBCHAT_REFERENCE_SOURCE)
            return [];
        try {
            return [decodeReference(occurrence.ref)];
        }
        catch {
            return [];
        }
    });
}
function matchingOccurrences(snapshot, conversationId) {
    return snapshot.occurrences.filter((occurrence) => {
        if (occurrence.source !== WEBCHAT_REFERENCE_SOURCE)
            return false;
        try {
            return decodeReference(occurrence.ref).conversationId === conversationId;
        }
        catch {
            return false;
        }
    });
}
/** 只更新未发送草稿内同一网页的引用，已发送消息中的快照保持不变。 */
export function addWebChatReference(input, reference, onCommitted) {
    const before = input.state.getSnapshot();
    const existing = matchingOccurrences(before, reference.conversationId);
    const ref = JSON.stringify(reference);
    if (existing.some(occurrence => occurrence.ref === ref)) {
        onCommitted?.();
        return true;
    }
    const target = existing[0];
    const span = target === undefined ? { start: 0, end: 0, draftRev: before.draftRev }
        : occurrenceEditSpan(input, before, target);
    if (span === undefined)
        return false;
    // insertReference 的 true 已确认编辑被接受；状态发布可晚于这个调用返回。
    return editComposerWithCommit(input, () => input.insertReference({
        source: WEBCHAT_REFERENCE_SOURCE, ref, label: reference.title,
        appearance: 'session', clipboardText: `@${reference.title}`,
    }, span), () => { onCommitted?.(); });
}
/** 草稿 chip 使用 DSH 官方 openReference 钩子，避免伪装成 DSH Session ID。 */
export function createWebChatReferenceSource(onOpen, locale) {
    const decode = (ref) => decodeReference(ref, locale.resolveText({
        zh: '网页讨论引用已失效，请重新添加。', en: 'This web discussion reference is invalid. Please add it again.',
    }));
    return {
        trigger: '@', name: WEBCHAT_REFERENCE_SOURCE, order: 1_002,
        candidates: async () => [], onPick: () => undefined,
        ...onOpen === undefined ? {} : { openReference: (_session, reference) => {
                let decoded;
                try {
                    decoded = decode(reference.ref);
                }
                catch {
                    return false;
                }
                onOpen(decoded);
                return true;
            } },
        codec: {
            clipboardText: ref => `@${decode(ref).title}`,
            serialize: async (ref, signal) => {
                if (signal.aborted)
                    throw signal.reason;
                return serializeWebChatReference(decode(ref));
            },
        },
    };
}
export function WebChatReferenceCard({ reference, onOpen, locale }) {
    const { active, text } = useDshLocale(locale);
    return (_jsxs("article", { className: "dsh-webchat-reference", "aria-label": text(`网页讨论引用：${reference.title}`, `Web discussion reference: ${reference.title}`), children: [_jsxs("div", { className: "dsh-webchat-reference-heading", children: [_jsxs("span", { className: "dsh-webchat-reference-title", children: [text('网页讨论', 'Web discussion'), " \u00B7 ", reference.title] }), onOpen === undefined ? null : _jsx("button", { type: "button", onClick: () => onOpen(reference), children: text('打开网页聊天', 'Open Web Chat') })] }), _jsx("div", { className: "dsh-webchat-reference-meta", children: text(`已采集 ${reference.messageCount} 条消息 · 当前已渲染分支，可能不含更早历史`, `${reference.messageCount} messages captured · Currently rendered branch; earlier history may be missing`) }), _jsxs("details", { className: "dsh-webchat-reference-preview", children: [_jsx("summary", { children: text('查看引用预览', 'Preview reference') }), _jsxs("p", { children: [text('采集时间：', 'Captured at: '), _jsx("time", { dateTime: reference.capturedAt, children: new Date(reference.capturedAt).toLocaleString(active) })] }), _jsx("p", { children: text('完整已采集正文随引用保存，DSH 可按需读取。网页后续变化不会改写此快照。', 'The full captured text is saved with this reference for DSH to read on demand. Later changes on the website do not alter this snapshot.') }), reference.preview.map((message, index) => (_jsxs("section", { className: "dsh-webchat-reference-message", children: [_jsx("strong", { children: message.role === 'user' ? text('你', 'You') : 'DeepSeek' }), _jsx("pre", { children: message.content })] }, `${message.id ?? 'message'}:${index}`)))] })] }));
}
export function WebChatDraftReferences({ input, onOpen, locale }) {
    const { text } = useDshLocale(locale);
    const references = webChatReferences(input);
    if (references.length === 0)
        return null;
    return (_jsxs("details", { className: "dsh-webchat-reference-draft", children: [_jsx("summary", { children: text(`网页讨论引用（${references.length}）`, `Web discussion references (${references.length})`) }), references.map(reference => _jsx(WebChatReferenceCard, { reference: reference, locale: locale, ...(onOpen === undefined ? {} : { onOpen }) }, reference.referenceId))] }));
}
