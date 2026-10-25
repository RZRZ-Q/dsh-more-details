export const WEB_CHAT_DESKTOP_REQUIRED = {
    zh: '网页讨论需要官方 DSH 桌面端的浏览器接口；普通浏览器中仍可使用添加到聊天、侧边对话和引用预览。',
    en: 'Web Chat requires the browser interface in the official DSH desktop app. Add to chat, side chat, and reference previews remain available in a regular browser.',
};
export function renderWebChatMessage(message, text) {
    return typeof message === 'string' ? message : text(message.zh, message.en);
}
export class WebChatMessageError extends Error {
    localizedMessage;
    constructor(localizedMessage) {
        super(typeof localizedMessage === 'string' ? localizedMessage : localizedMessage.zh);
        this.localizedMessage = localizedMessage;
    }
}
/** 外部错误诊断不翻译；插件自有错误保留双语，交由 UI 决定当前显示语言。 */
export function webChatErrorMessage(error) {
    return error instanceof WebChatMessageError ? error.localizedMessage
        : error instanceof Error ? error.message : String(error);
}
/** 仅翻译 prepare/save 的既有 Host 文案，保持 RPC 和错误诊断契约不变。 */
export function webChatHostMessage(message) {
    const messages = {
        'Select a completed parent turn before opening More details.': {
            zh: '请先选择主会话中已完成回合的文字，再打开更多详情。',
            en: 'Select a completed parent turn before opening More details.',
        },
        'The selected source message is no longer available. Select the text again.': {
            zh: '选文所属消息已不可用，请重新选择文字。',
            en: 'The selected source message is no longer available. Select the text again.',
        },
        'Select some conversation text first.': {
            zh: '请先选择会话中的文字。', en: 'Select some conversation text first.',
        },
        'The selected text is too large.': {
            zh: '选中文字过长。', en: 'The selected text is too large.',
        },
        '网页讨论快照格式无效。': {
            zh: '网页讨论快照格式无效。', en: 'The Web Chat snapshot format is invalid.',
        },
        '网页讨论快照超过 8 MiB，请缩小采集范围后重试。': {
            zh: '网页讨论快照超过 8 MiB，请缩小采集范围后重试。',
            en: 'The Web Chat snapshot exceeds 8 MiB. Capture a smaller range and try again.',
        },
    };
    if (Object.hasOwn(messages, message))
        return messages[message];
    const savePrefix = '无法保存网页讨论引用：';
    if (message.startsWith(savePrefix)) {
        const detail = webChatHostMessage(message.slice(savePrefix.length));
        return { zh: `${savePrefix}${renderWebChatMessage(detail, zh => zh)}`,
            en: `Could not save the Web Chat reference: ${renderWebChatMessage(detail, (_zh, en) => en)}` };
    }
    const contextPrefix = 'Could not read the parent context: ';
    if (message.startsWith(contextPrefix)) {
        return { zh: `无法读取主会话上下文：${message.slice(contextPrefix.length)}`, en: message };
    }
    return message;
}
