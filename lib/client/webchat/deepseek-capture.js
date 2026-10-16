/**
 * 代码围栏与 TeX 提取参考 FrostLeafKEE/dsh-chat-bridge，MIT 许可见 THIRD_PARTY_NOTICES.md。
 * 只读官网当前已渲染分支；函数序列化进 guest 后不能依赖模块级运行时值。
 */
function captureRenderedConversation(expectedUrl) {
    const fail = (reason) => ({ ok: false, reason });
    if (location.origin !== 'https://chat.deepseek.com')
        return fail('当前页面不是 DeepSeek 官网。');
    const url = location.origin + location.pathname.replace(/\/$/, '');
    if (url !== expectedUrl)
        return fail('网页已切换，请确认目标聊天后重新添加。');
    if (!/^\/a\/[\w-]+\/s\/[\w-]+\/?$/.test(location.pathname))
        return fail('请先打开已有问答的网页聊天。');
    // 三个公开构建核验了相同角色、正文和结束操作栏结构；构建文件名用于诊断，不作为页面契约。
    // useShowAssistantActions 只在 !isWIP(status) 时渲染，不能仅用“没有停止按钮”推断完成。
    const publicAssetNames = (sources) => sources.flatMap(raw => {
        try {
            const source = new URL(raw);
            if (source.protocol !== 'https:' || !source.hostname.endsWith('.deepseek.com'))
                return [];
            const basename = source.pathname.split('/').at(-1) ?? '';
            return /^[\w.-]+\.m?js$/.test(basename) ? [`${source.origin}/${basename}`] : [];
        }
        catch {
            return [];
        }
    });
    const unknownStructure = (reason) => {
        const publicScripts = publicAssetNames(Array.from(document.scripts, script => script.src));
        const preloads = publicAssetNames(Array.from(document.querySelectorAll('link[rel="modulepreload"]'), link => link.href));
        const sources = [...publicScripts.map(source => `script ${source}`), ...preloads.map(source => `modulepreload ${source}`)];
        return fail(`${reason}公开脚本：${sources.slice(0, 8).join('，') || '未发现 DeepSeek 外链脚本'}`);
    };
    const rendered = (element) => {
        if (element.closest('[hidden], [aria-hidden="true"]'))
            return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const busy = Array.from(document.querySelectorAll('._52c986b')).filter(rendered).some(control => control.querySelector('[data-icon="spin"]') !== null
        || Array.from(control.querySelectorAll('path')).some(path => (path.getAttribute('d') ?? '').startsWith('M2 4.88C2 3.68009')))
        || Array.from(document.querySelectorAll('.ds-message .b4e4476b')).some(rendered);
    if (busy)
        return fail('网页仍在生成回答，请等回答结束后再添加。');
    const escapeText = (text) => text.replace(/[\\`*_[\]]/g, '\\$&');
    const markerFor = (text, minimum) => {
        const longest = Math.max(0, ...Array.from(text.matchAll(/`+/g), match => match[0].length));
        return '`'.repeat(Math.max(minimum, longest + 1));
    };
    let unsupported = false;
    const children = (node) => Array.from(node.childNodes, child => read(child)).join('');
    const read = (node) => {
        if (node.nodeType === Node.TEXT_NODE)
            return escapeText(node.textContent ?? '');
        if (!(node instanceof Element))
            return '';
        if (node.matches('script, style, button, input, textarea, [role="button"], .ds-think-content, [hidden]'))
            return '';
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden')
            return '';
        if (node.classList.contains('katex') || node.classList.contains('katex-display')) {
            const tex = node.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
            if (!tex) {
                unsupported = true;
                return '';
            }
            return node.classList.contains('katex-display') ? `\n\n$$\n${tex}\n$$\n\n` : `$${tex}$`;
        }
        if (node.getAttribute('aria-hidden') === 'true')
            return '';
        if (node.classList.contains('md-code-block') || node.tagName === 'PRE') {
            const pre = node.tagName === 'PRE' ? node : node.querySelector('pre');
            if (!pre) {
                unsupported = true;
                return '';
            }
            const code = pre.textContent ?? '';
            const marker = markerFor(code, 3);
            const language = (node.querySelector('.md-code-block-infostring')?.textContent
                ?? pre.querySelector('code')?.className.match(/(?:^|\s)language-([\w.+#-]+)/)?.[1] ?? '').trim();
            return `\n\n${marker}${/^[\w.+#-]{1,40}$/.test(language) ? language : ''}\n${code}${code.endsWith('\n') ? '' : '\n'}${marker}\n\n`;
        }
        if (node.tagName === 'CODE') {
            const code = node.textContent ?? '';
            const marker = markerFor(code, 1);
            return `${marker} ${code} ${marker}`;
        }
        if (node.tagName === 'IMG')
            return `[图片未采集${node.getAttribute('alt') ? `：${escapeText(node.getAttribute('alt'))}` : ''}]`;
        if (['SVG', 'CANVAS', 'IFRAME', 'VIDEO', 'AUDIO'].includes(node.tagName.toUpperCase()))
            return '[非文本内容未采集]';
        if (node.tagName === 'BR')
            return '\n';
        if (node.tagName === 'HR')
            return '\n\n---\n\n';
        if (node.tagName === 'TABLE') {
            if (Array.from(node.querySelectorAll('th, td')).some(cell => Number(cell.getAttribute('colspan') ?? '1') !== 1
                || Number(cell.getAttribute('rowspan') ?? '1') !== 1)) {
                unsupported = true;
                return '';
            }
            const rows = Array.from(node.querySelectorAll('tr')).filter(row => row.closest('table') === node);
            const lines = rows.map(row => Array.from(row.children).filter(cell => /^(TH|TD)$/.test(cell.tagName))
                .map(cell => children(cell).trim().replace(/\|/g, '\\|').replace(/\n+/g, '<br>')));
            const columns = Math.max(0, ...lines.map(line => line.length));
            if (columns === 0) {
                unsupported = true;
                return '';
            }
            const rowText = (cells) => '| ' + Array.from({ length: columns }, (_, index) => cells[index] ?? '').join(' | ') + ' |';
            return '\n\n' + [rowText(lines[0]), rowText(Array.from({ length: columns }, () => '---')), ...lines.slice(1).map(rowText)].join('\n') + '\n\n';
        }
        if (node.tagName === 'UL' || node.tagName === 'OL') {
            const start = Number(node.getAttribute('start') ?? '1');
            const items = Array.from(node.children).filter(child => child.tagName === 'LI');
            return '\n\n' + items.map((item, index) => {
                const prefix = node.tagName === 'OL' ? `${start + index}. ` : '- ';
                return prefix + children(item).trim().replace(/\n/g, '\n' + ' '.repeat(prefix.length));
            }).join('\n') + '\n\n';
        }
        const content = children(node);
        if (node.tagName === 'A') {
            const href = node.getAttribute('href');
            if (!href)
                return content;
            let destination;
            try {
                destination = new URL(href, location.href);
            }
            catch {
                return content;
            }
            return ['https:', 'http:', 'mailto:'].includes(destination.protocol) && !destination.username && !destination.password
                ? `[${content}](<${destination.href.replace(/>/g, '%3E')}>)` : content;
        }
        if (/^H[1-6]$/.test(node.tagName))
            return '\n\n' + '#'.repeat(Number(node.tagName.slice(1))) + ' ' + content.trim() + '\n\n';
        if (node.tagName === 'BLOCKQUOTE')
            return '\n\n' + content.trim().split('\n').map(line => '> ' + line).join('\n') + '\n\n';
        if (node.tagName === 'STRONG' || node.tagName === 'B')
            return `**${content}**`;
        if (node.tagName === 'EM' || node.tagName === 'I')
            return `*${content}*`;
        if (node.tagName === 'DEL' || node.tagName === 'S')
            return `~~${content}~~`;
        if (node.tagName === 'P' || node.tagName === 'DIV')
            return '\n\n' + content + '\n\n';
        return content;
    };
    const rows = Array.from(document.querySelectorAll('.ds-message')).filter(rendered);
    const messages = [];
    for (const row of rows) {
        const userWrapper = row.closest('._9663006');
        const assistantWrapper = row.closest('._4f9bf79');
        const users = row.querySelectorAll('.ds-collapsible-text > div > span');
        const assistants = row.querySelectorAll('.ds-assistant-message-main-content');
        const isUser = userWrapper !== null && assistantWrapper === null && userWrapper.querySelector('.ds-message') === row
            && users.length === 1 && assistants.length === 0;
        const isAssistant = assistantWrapper !== null && userWrapper === null && assistantWrapper.querySelector('.ds-message') === row
            && assistants.length === 1 && users.length === 0;
        const body = isUser ? users[0] : isAssistant ? assistants[0] : undefined;
        if (!body || row.querySelector('textarea'))
            return unknownStructure('暂时无法辨认网页消息角色或正文，未添加引用。');
        if (isAssistant) {
            const actions = assistantWrapper.querySelector(':scope > ._0a3d93b > ._965abe9');
            if (!actions)
                return unknownStructure('尚未确认网页回答已结束，请等回答结束后再添加。');
        }
        const content = isUser ? body.textContent?.trim() ?? '' : read(body).trim();
        if (unsupported || !content)
            return fail('网页包含尚不能可靠采集的正文结构，未添加引用。');
        messages.push({ id: row.closest('[data-virtual-list-item-key]')?.getAttribute('data-virtual-list-item-key') ?? null,
            role: isUser ? 'user' : 'assistant', content });
    }
    if (messages.length === 0 || !messages.some(message => message.role === 'assistant'))
        return fail('当前页面还没有可引用的问答。');
    return { ok: true, capture: { version: 1, url, title: document.title.trim() || 'DeepSeek Chat', capturedAt: new Date().toISOString(),
            scope: 'rendered-current-branch', completeness: 'partial', messages } };
}
export function deepSeekCaptureScript(expectedUrl) {
    return `(${captureRenderedConversation.toString()})(${JSON.stringify(expectedUrl)})`;
}
