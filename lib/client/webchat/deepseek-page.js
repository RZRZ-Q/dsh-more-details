/** 历史只保存官网会话路径，剔除可能含临时参数的 query/hash。 */
export function parseDeepSeekConversationUrl(raw) {
    let url;
    try {
        url = new URL(raw);
    }
    catch {
        return null;
    }
    if (url.origin !== 'https://chat.deepseek.com' || url.username !== '' || url.password !== '')
        return null;
    const match = /^\/a\/([\w-]+)\/s\/([\w-]+)\/?$/.exec(url.pathname);
    if (!match?.[2])
        return null;
    return { url: url.origin + url.pathname.replace(/\/$/, ''), conversationId: match[2] };
}
/** 此函数会序列化进入 guest，所有运行时依赖必须保留在函数内部。 */
async function operateDeepSeekPage(command) {
    const origin = 'https://chat.deepseek.com';
    const cleanUrl = () => location.origin + location.pathname;
    const onSite = () => location.origin === origin;
    const conversationId = () => onSite()
        ? /^\/a\/[\w-]+\/s\/([\w-]+)\/?$/.exec(location.pathname)?.[1] ?? null : null;
    const visible = (element) => {
        if (element.closest('[hidden], [aria-hidden="true"]'))
            return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const enabled = (element) => !element.hasAttribute('disabled')
        && element.getAttribute('aria-disabled') !== 'true' && !element.classList.contains('ds-button--disabled');
    const nameMatches = (element, pattern) => ['aria-label', 'title'].some(key => pattern.test((element.getAttribute(key) ?? '').trim()))
        || pattern.test((element.textContent ?? '').trim());
    const composer = () => {
        // Ckarefulon 固定版使用的官网 textarea 及原生 value setter。
        for (const selector of ['textarea.ds-textarea__textarea', 'textarea[placeholder]', 'textarea']) {
            const inputs = Array.from(document.querySelectorAll(selector))
                .filter(input => visible(input) && !input.closest('.ds-message'));
            if (inputs.length === 1)
                return inputs[0] ?? null;
            if (inputs.length > 1)
                return null;
        }
        return null;
    };
    const newChatControl = () => {
        // 官网可能用普通 div 呈现入口；只接受完整标签，排除聊天正文里的同名文字。
        const labels = /^(开启新对话|新对话|新建对话|新聊天|New chat)$/i;
        const candidates = Array.from(document.querySelectorAll('button, [role="button"], a, div, span'))
            .filter(element => !element.closest('.ds-message') && !element.querySelector('textarea, .ds-message')
            && visible(element) && enabled(element) && nameMatches(element, labels));
        const leaves = candidates.filter(element => !candidates.some(other => other !== element && element.contains(other)));
        const controls = [...new Set(leaves.map(element => element.closest('button, [role="button"], a') ?? element))]
            .filter(element => visible(element) && enabled(element));
        if (controls.length > 0)
            return controls.length === 1 ? controls[0] ?? null : null;
        // 官网 main.6fca03582d.js：b_ 移动顶部 → _m("mobile_top_right") → oe.Yp。
        // 此按钮没有文案/aria-label；用已核对的容器、按钮类型和完整 SVG 匹配，不按位置猜测。
        const newChatPath = 'M9.99994 1.22943C5.15598 1.22943 1.22937 5.15604 1.22937 10C1.22937 11.3437 1.5319 12.6189 2.07359 13.7592L2.40673 14.4596L3.8065 13.7942L3.4743 13.0939L3.31625 12.7371C2.97051 11.8938 2.77962 10.97 2.77962 10C2.77962 6.01243 6.01237 2.77968 9.99994 2.77968C13.9875 2.77968 17.2203 6.01243 17.2203 10C17.2203 13.9876 13.9875 17.2203 9.99994 17.2203C9.18334 17.2203 8.5858 17.1622 8.05597 17.0159C7.53397 16.8717 7.03885 16.6305 6.44609 16.2171C5.57744 15.6112 4.33224 15.3975 3.30584 16.0458L3.28975 16.0562L3.27366 16.0676L2.59034 16.5484L3.10425 18.0825L4.14438 17.35C4.51831 17.1207 5.07296 17.1507 5.55834 17.4891C6.26058 17.9789 6.91499 18.3092 7.64333 18.5103C8.3639 18.7093 9.11779 18.7706 9.99994 18.7706C14.8439 18.7706 18.7705 14.844 18.7705 10C18.7705 5.15604 14.8439 1.22943 9.99994 1.22943ZM9.21913 6.36949V9.22487H6.36943V10.7751H9.21913V13.6305H10.7694V10.7751H13.6304V9.22487H10.7694V6.36949H9.21913Z';
        const icons = Array.from(document.querySelectorAll('._1aa2651.the-header > .ds-button--icon[role="button"]'))
            .filter(element => visible(element) && enabled(element) && !element.closest('.ds-message, [role="dialog"]')
            && Array.from(element.querySelectorAll('svg[viewBox="0 0 20 20"] path')).some(path => path.getAttribute('d') === newChatPath));
        return icons.length === 1 ? icons[0] ?? null : null;
    };
    const snapshot = () => {
        const empty = { url: cleanUrl(), title: '', conversationId: null, login: 'unknown',
            composerPresent: false, composerEmpty: true, messages: [], messageRead: 'unsupported', generating: null, canCreate: false };
        if (!onSite())
            return empty;
        const input = composer();
        const controls = Array.from(document.querySelectorAll('button, [role="button"], ._52c986b'))
            .filter(element => visible(element) && !element.closest('.ds-message'));
        const loginRequired = /^\/sign_in\/?$/.test(location.pathname)
            || (input === null && controls.some(element => nameMatches(element, /^(登录|登录\/注册|Log in|Sign in)$/i)));
        const rows = Array.from(document.querySelectorAll('.ds-message')).filter(visible);
        const messages = [];
        let messageRead = 'supported';
        for (const row of rows) {
            // 只采集已证实的正文节点，不按奇偶顺序猜角色，不把按钮文字混入消息。
            const users = row.querySelectorAll('.ds-collapsible-text > div > span');
            const assistants = row.querySelectorAll('.ds-assistant-message-main-content');
            const isUser = users.length === 1 && assistants.length === 0;
            const isAssistant = assistants.length === 1 && users.length === 0;
            const body = isUser ? users[0] : isAssistant ? assistants[0] : undefined;
            if (!body || row.querySelector('textarea')) {
                messageRead = 'unsupported';
                continue;
            }
            const text = isUser ? body.textContent ?? '' : body.innerText ?? body.textContent ?? '';
            const id = row.closest('[data-virtual-list-item-key]')?.getAttribute('data-virtual-list-item-key') ?? null;
            messages.push({ id, role: isUser ? 'user' : 'assistant', text });
        }
        // 已公开前端中的停止图形和加载节点；未观察到可靠控件时保留 unknown。
        const busy = controls.some(element => nameMatches(element, /^(停止|停止生成|Stop|Stop generating)$/i)
            || element.querySelector('[data-icon="spin"]') !== null
            || Array.from(element.querySelectorAll('path')).some(path => (path.getAttribute('d') ?? '').startsWith('M2 4.88C2 3.68009')))
            || Array.from(document.querySelectorAll('.ds-message .b4e4476b')).some(visible);
        const sendVisible = controls.some(element => nameMatches(element, /^(发送|发送消息|Send|Send message|Submit)$/i));
        return { url: cleanUrl(), title: document.title.trim(), conversationId: conversationId(),
            login: loginRequired ? 'required' : input !== null ? 'ready' : 'unknown',
            composerPresent: input !== null, composerEmpty: input === null || input.value.trim() === '',
            messages, messageRead, generating: busy ? true : sendVisible ? false : null, canCreate: newChatControl() !== null };
    };
    const action = (status, reason = null) => ({ status, reason, snapshot: snapshot() });
    const page = document;
    if (command.type === 'probe')
        return snapshot();
    if (command.type === 'receipt') {
        const current = snapshot();
        const pending = page.__dshMoreDetailsSubmission;
        const receipt = (status, message = null) => ({ status, message, snapshot: current });
        if (!pending || pending.request.requestId !== command.requestId || !pending.dispatched || pending.interrupted)
            return receipt('unknown');
        if (!onSite() || (pending.conversationId !== null && current.conversationId !== pending.conversationId)) {
            pending.stopObserving();
            return receipt('target-changed');
        }
        if (current.login !== 'ready' || current.messageRead !== 'supported' || current.conversationId === null)
            return receipt('pending');
        const matches = current.messages.filter(message => message.role === 'user' && message.text === pending.request.text);
        const received = matches.find(message => message.id !== null && !pending.baselineIds.includes(message.id));
        // 无消息 ID 时只接受同一当前页面新增的精确文本数量，不以清空输入框作回执。
        if (received || matches.length > pending.baselineCount) {
            // 有本次消息证据后才绑定新 ID；后续再切页不能改写这份已确认回执。
            pending.conversationId = current.conversationId;
            pending.stopObserving();
            return receipt('accepted', received ?? matches.at(-1) ?? null);
        }
        return receipt('pending');
    }
    if (!onSite())
        return action('blocked', 'wrong-origin');
    if (cleanUrl() !== command.expectedUrl)
        return action('blocked', 'target-changed');
    const before = snapshot();
    if (before.login !== 'ready')
        return action('blocked', before.login === 'required' ? 'login-required' : 'page-not-ready');
    if (before.generating === true)
        return action('blocked', 'generating');
    if (!before.composerEmpty)
        return action('blocked', 'draft-present');
    if (command.type === 'new') {
        const control = newChatControl();
        if (!control)
            return action('blocked', 'new-chat-unavailable');
        page.__dshMoreDetailsSubmission?.stopObserving();
        delete page.__dshMoreDetailsSubmission;
        control.click();
        return action('dispatched');
    }
    if (page.__dshMoreDetailsSubmission?.request.requestId === command.requestId)
        return action('already-dispatched');
    if (!command.requestId || !command.text.trim())
        return action('blocked', 'empty-request');
    if (before.messageRead !== 'supported')
        return action('blocked', 'messages-unsupported');
    const input = composer();
    if (!input || !enabled(input) || input.readOnly)
        return action('blocked', 'composer-unavailable');
    page.__dshMoreDetailsSubmission?.stopObserving();
    const interaction = new AbortController();
    const pending = { request: { requestId: command.requestId, text: command.text, expectedUrl: command.expectedUrl },
        conversationId: before.conversationId,
        baselineCount: before.messages.filter(message => message.role === 'user' && message.text === command.text).length,
        baselineIds: before.messages.flatMap(message => message.id === null ? [] : [message.id]), dispatched: false,
        interrupted: false, stopObserving: () => { interaction.abort(); } };
    page.__dshMoreDetailsSubmission = pending;
    // 首次发送尚无 ID；用户切到含同文的旧聊天后，单凭 URL+正文不能证明接收。
    // 捕获真实操作即停止自动认领；我们发出的 input/Enter 为非 trusted 事件。
    const interrupt = (event) => {
        if (!event.isTrusted)
            return;
        pending.interrupted = true;
        pending.stopObserving();
    };
    for (const type of ['pointerdown', 'keydown', 'beforeinput', 'click', 'paste', 'drop', 'wheel', 'popstate']) {
        window.addEventListener(type, interrupt, { capture: true, signal: interaction.signal });
    }
    try {
        input.focus();
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        if (!setter)
            return action('blocked', 'composer-unavailable');
        setter.call(input, command.text);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        // 等官网受控输入框提交更新，再核对页面与草稿；只触发一次发送路径。
        await new Promise(resolve => setTimeout(resolve, 120));
        if (pending.interrupted)
            return action('blocked', 'user-interrupted');
        if (page.__dshMoreDetailsSubmission !== pending || cleanUrl() !== command.expectedUrl
            || !input.isConnected || composer() !== input)
            return action('blocked', 'target-changed');
        if (input.value !== command.text || !enabled(input) || input.readOnly)
            return action('blocked', 'composer-changed');
        if (snapshot().generating === true)
            return action('blocked', 'generating');
        pending.dispatched = true;
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
            bubbles: true, cancelable: true, composed: true }));
        return action('dispatched');
    }
    finally {
        if (!pending.dispatched)
            pending.stopObserving();
    }
}
/** 由宿主 webview.executeJavaScript 执行，参数只通过 JSON 编码传入。 */
function pageScript(command) {
    return `(${operateDeepSeekPage.toString()})(${JSON.stringify(command)})`;
}
export function deepSeekProbeScript() { return pageScript({ type: 'probe' }); }
export function deepSeekNewChatScript(expectedUrl) { return pageScript({ type: 'new', expectedUrl }); }
export function deepSeekSendScript(request) {
    // textarea 会把 CRLF 归一为 LF，回执比较使用同一份浏览器实际输入。
    return pageScript({ type: 'send', ...request, text: request.text.replace(/\r\n?/g, '\n') });
}
export function deepSeekReceiptScript(requestId) { return pageScript({ type: 'receipt', requestId }); }
