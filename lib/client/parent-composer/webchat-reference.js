import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { isWebChatReference, serializeWebChatReference, } from '../../shared/webchat-reference.js';
import { editComposerWithCommit, occurrenceEditSpan, } from './composer-reference.js';
export const WEBCHAT_REFERENCE_SOURCE = 'dsh-more-details-webchat';
function decodeReference(ref) {
    const value = JSON.parse(ref);
    if (!isWebChatReference(value))
        throw new Error('网页讨论引用已失效，请重新添加。');
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
export function createWebChatReferenceSource(onOpen) {
    return {
        trigger: '@', name: WEBCHAT_REFERENCE_SOURCE, order: 1_002,
        candidates: async () => [], onPick: () => undefined,
        openReference: (_session, reference) => {
            let decoded;
            try {
                decoded = decodeReference(reference.ref);
            }
            catch {
                return false;
            }
            onOpen(decoded);
            return true;
        },
        codec: {
            clipboardText: ref => `@${decodeReference(ref).title}`,
            serialize: async (ref, signal) => {
                if (signal.aborted)
                    throw signal.reason;
                return serializeWebChatReference(decodeReference(ref));
            },
        },
    };
}
export function WebChatReferenceCard({ reference, onOpen }) {
    return (_jsxs("article", { className: "dsh-webchat-reference", "aria-label": `网页讨论引用：${reference.title}`, children: [_jsxs("div", { className: "dsh-webchat-reference-heading", children: [_jsxs("span", { className: "dsh-webchat-reference-title", children: ["\u7F51\u9875\u8BA8\u8BBA \u00B7 ", reference.title] }), onOpen === undefined ? null : _jsx("button", { type: "button", onClick: () => onOpen(reference), children: "\u6253\u5F00\u7F51\u9875\u804A\u5929" })] }), _jsxs("div", { className: "dsh-webchat-reference-meta", children: ["\u5DF2\u91C7\u96C6 ", reference.messageCount, " \u6761\u6D88\u606F \u00B7 \u5F53\u524D\u5DF2\u6E32\u67D3\u5206\u652F\uFF0C\u53EF\u80FD\u4E0D\u542B\u66F4\u65E9\u5386\u53F2"] }), _jsxs("details", { className: "dsh-webchat-reference-preview", children: [_jsx("summary", { children: "\u67E5\u770B\u5F15\u7528\u9884\u89C8" }), _jsxs("p", { children: ["\u91C7\u96C6\u65F6\u95F4\uFF1A", _jsx("time", { dateTime: reference.capturedAt, children: new Date(reference.capturedAt).toLocaleString() })] }), _jsx("p", { children: "\u5B8C\u6574\u5DF2\u91C7\u96C6\u6B63\u6587\u968F\u5F15\u7528\u4FDD\u5B58\uFF0CDSH \u53EF\u6309\u9700\u8BFB\u53D6\u3002\u7F51\u9875\u540E\u7EED\u53D8\u5316\u4E0D\u4F1A\u6539\u5199\u6B64\u5FEB\u7167\u3002" }), reference.preview.map((message, index) => (_jsxs("section", { className: "dsh-webchat-reference-message", children: [_jsx("strong", { children: message.role === 'user' ? '你' : 'DeepSeek' }), _jsx("pre", { children: message.content })] }, `${message.id ?? 'message'}:${index}`)))] })] }));
}
export function WebChatDraftReferences({ input, onOpen }) {
    const references = webChatReferences(input);
    if (references.length === 0)
        return null;
    return (_jsxs("details", { className: "dsh-webchat-reference-draft", children: [_jsxs("summary", { children: ["\u7F51\u9875\u8BA8\u8BBA\u5F15\u7528\uFF08", references.length, "\uFF09"] }), references.map(reference => _jsx(WebChatReferenceCard, { reference: reference, ...(onOpen === undefined ? {} : { onOpen }) }, reference.referenceId))] }));
}
