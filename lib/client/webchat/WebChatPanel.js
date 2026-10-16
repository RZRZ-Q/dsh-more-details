import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { MoreDetailsSettings } from '../dsh/MoreDetailsSettings.js';
import { useDshLocale } from '../dsh/locale.js';
import { DEFAULT_WEBCHAT_LAYOUT } from '../../shared/webchat-layout.js';
import { renderWebChatMessage } from './messages.js';
/** 容器始终挂载；切换页面与收起只改变可见性，保留原生 guest 的登录和会话。 */
export function WebChatPanel({ controller, guest, form, locale }) {
    const { text } = useDshLocale(locale);
    const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
    const loginMessage = useSyncExternalStore(guest.subscribeLogin, guest.getLoginMessage, guest.getLoginMessage);
    const [view, setView] = useState('chat');
    const [layout, setLayout] = useState(DEFAULT_WEBCHAT_LAYOUT);
    const layoutRef = useRef(layout);
    const hydratedForm = useRef(null);
    const saveGeneration = useRef(0);
    const [layoutSave, setLayoutSave] = useState(null);
    const { expanded } = layout;
    const [resizing, setResizing] = useState(false);
    const panel = useRef(null);
    const drag = useRef(null);
    const removeDragEndListeners = useRef(null);
    const container = useRef(null);
    const subscribeForm = useCallback((listener) => form.subscribe(listener), [form]);
    const getFormSnapshot = useCallback(() => form.getSnapshot(), [form]);
    const preferences = useSyncExternalStore(subscribeForm, getFormSnapshot, getFormSnapshot);
    const usePromptSettings = (selector) => selector(useSyncExternalStore(subscribeForm, getFormSnapshot, getFormSnapshot));
    // alpha.4 已移除 mode；保留 rc.2 对非持久化 memory 配置的限制。
    const persistent = !('mode' in preferences) || preferences.mode === 'host';
    const layoutWritable = preferences.status === 'ready' && persistent && preferences.writable;
    const layoutAvailability = preferences.status === 'loading'
        ? text('正在读取上次的窗口大小…', 'Loading the previous window size…')
        : preferences.status !== 'ready' || !persistent
            ? text('无法读取或保存窗口大小，请确认本机“更多详情”配置可用。', 'Cannot load or save the window size. Check that local More details settings are available.')
            : !preferences.writable
                ? text('当前 DSH 配置只读，无法保存窗口大小。', 'DSH settings are read-only; the window size cannot be saved.')
                : null;
    useEffect(() => {
        if (preferences.status !== 'ready' || preferences.value === undefined || hydratedForm.current === form)
            return;
        hydratedForm.current = form;
        layoutRef.current = preferences.value.webChatLayout;
        setLayout(preferences.value.webChatLayout);
    }, [form, preferences]);
    useEffect(() => {
        if (container.current !== null)
            guest.attach(container.current);
        // guest 的释放由插件生命周期负责；这里不能删除或移动 webview。
    }, [guest]);
    const guestLabel = text('DeepSeek 网页聊天', 'DeepSeek web chat');
    useEffect(() => { guest.setAccessibleLabel(guestLabel); }, [guest, guestLabel]);
    useEffect(() => {
        if (state.busy)
            setView('chat');
    }, [state.busy]);
    useEffect(() => () => {
        removeDragEndListeners.current?.();
        drag.current = null;
    }, []);
    const showChat = () => { setView('chat'); controller.show(); };
    const newChat = () => { setView('chat'); void controller.newChat(); };
    const persistLayout = async (value) => {
        const generation = ++saveGeneration.current;
        setLayoutSave('saving');
        try {
            const accepted = await form.set('webChatLayout', value);
            if (generation !== saveGeneration.current)
                return;
            setLayoutSave(accepted ? null : { error: { zh: '窗口大小未保存：配置可能已变化或不允许写入，请重新调整后重试。', en: 'Window size was not saved: settings changed or are not writable. Resize again to retry.' } });
        }
        catch (error) {
            if (generation !== saveGeneration.current)
                return;
            const detail = error instanceof Error ? error.message : String(error);
            setLayoutSave({ error: { zh: `窗口大小未保存：${detail}`, en: `Window size was not saved: ${detail}` } });
        }
    };
    const resize = (width, height) => {
        const narrow = window.innerWidth <= 560;
        const maxWidth = window.innerWidth - (narrow ? 16 : 40);
        const maxHeight = window.innerHeight - (narrow ? 48 : 64);
        const next = { ...layoutRef.current,
            width: Math.min(maxWidth, Math.max(360, width)),
            height: Math.min(maxHeight, Math.max(360, height)),
        };
        layoutRef.current = next;
        setLayout(next);
        return next;
    };
    const startResize = (event, axis) => {
        if (!layoutWritable || event.button !== 0 || panel.current === null)
            return;
        event.preventDefault();
        const bounds = panel.current.getBoundingClientRect();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY,
            width: bounds.width, height: bounds.height, axis };
        // Electron guest 场景下释放可能落到手柄之外，在捕获阶段统一收尾。
        removeDragEndListeners.current?.();
        const finish = (ended) => {
            if (drag.current?.pointerId === ended.pointerId)
                endResize();
        };
        window.addEventListener('pointerup', finish, true);
        window.addEventListener('pointercancel', finish, true);
        removeDragEndListeners.current = () => {
            window.removeEventListener('pointerup', finish, true);
            window.removeEventListener('pointercancel', finish, true);
            removeDragEndListeners.current = null;
        };
        setResizing(true);
    };
    const moveResize = (event) => {
        const start = drag.current;
        if (start === null || start.pointerId !== event.pointerId)
            return;
        resize(start.width + (start.axis === 'height' ? 0 : start.x - event.clientX), start.height + (start.axis === 'width' ? 0 : start.y - event.clientY));
    };
    const endResize = () => {
        if (drag.current === null)
            return;
        drag.current = null;
        removeDragEndListeners.current?.();
        setResizing(false);
        void persistLayout(layoutRef.current);
    };
    const resizeWithKeyboard = (event) => {
        const bounds = panel.current?.getBoundingClientRect();
        if (!layoutWritable || bounds === undefined || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
            return;
        event.preventDefault();
        void persistLayout(resize(bounds.width + (event.key === 'ArrowLeft' ? 24 : event.key === 'ArrowRight' ? -24 : 0), bounds.height + (event.key === 'ArrowUp' ? 24 : event.key === 'ArrowDown' ? -24 : 0)));
    };
    const toggleExpanded = () => {
        const next = { ...layoutRef.current, expanded: !layoutRef.current.expanded };
        layoutRef.current = next;
        setLayout(next);
        void persistLayout(next);
    };
    const resizeEvents = { onPointerMove: moveResize, onPointerUp: endResize,
        onPointerCancel: endResize, onLostPointerCapture: endResize };
    return (_jsxs(_Fragment, { children: [_jsxs("aside", { ref: panel, className: "dsh-webchat-panel", "data-side-chat-panel": "", "aria-label": "DeepSeek Chat", "data-resizing": resizing || undefined, "aria-busy": state.busy || undefined, style: { display: state.visible ? 'flex' : 'none',
                    width: expanded ? 'var(--webchat-max-width)' : layout.width,
                    height: expanded ? 'var(--webchat-max-height)' : layout.height }, children: [!expanded && _jsxs(_Fragment, { children: [_jsx("div", { className: "dsh-webchat-resize-edge dsh-webchat-resize-top", "aria-hidden": "true", onPointerDown: event => startResize(event, 'height'), ...resizeEvents }), _jsx("div", { className: "dsh-webchat-resize-edge dsh-webchat-resize-left", "aria-hidden": "true", onPointerDown: event => startResize(event, 'width'), ...resizeEvents }), _jsx("button", { type: "button", className: "dsh-webchat-resize-corner", disabled: !layoutWritable, "aria-label": text('调整聊天窗口大小', 'Resize chat window'), title: text('拖动或用方向键调整大小', 'Drag or use arrow keys to resize'), onPointerDown: event => startResize(event, 'both'), onKeyDown: resizeWithKeyboard, ...resizeEvents, children: _jsx("svg", { width: "12", height: "12", viewBox: "0 0 12 12", "aria-hidden": "true", children: _jsx("path", { d: "M2 9V2h7M2 2l8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.5" }) }) })] }), _jsxs("header", { className: "dsh-webchat-header", children: [_jsx("button", { type: "button", className: "dsh-webchat-title", onClick: showChat, "aria-label": text('返回 DeepSeek 网页聊天', 'Return to DeepSeek web chat'), children: "DeepSeek Chat" }), _jsxs("nav", { className: "dsh-webchat-actions", "aria-label": text('网页聊天操作', 'Web chat actions'), children: [_jsx("button", { type: "button", disabled: state.busy, onClick: newChat, children: text('新建', 'New') }), _jsx("button", { type: "button", disabled: state.busy, "aria-pressed": view === 'history', onClick: () => { setView(view === 'history' ? 'chat' : 'history'); }, children: text('历史', 'History') }), _jsx("button", { type: "button", disabled: state.busy, "aria-pressed": view === 'settings', onClick: () => { setView(view === 'settings' ? 'chat' : 'settings'); }, children: text('提示词', 'Prompt') }), _jsx("button", { type: "button", disabled: !layoutWritable, "aria-label": expanded ? text('还原聊天窗口大小', 'Restore chat window size') : text('放大聊天窗口', 'Expand chat window'), onClick: toggleExpanded, children: expanded ? text('还原', 'Restore') : text('放大', 'Expand') }), _jsx("button", { type: "button", "aria-label": text('收起 DeepSeek Chat', 'Collapse DeepSeek Chat'), onClick: () => { controller.hide(); }, children: text('收起', 'Collapse') })] })] }), (layoutAvailability !== null || layoutSave !== null) && _jsxs("div", { className: "dsh-webchat-notice", children: [layoutAvailability !== null && _jsx("p", { role: preferences.status === 'loading' ? 'status' : 'alert', children: layoutAvailability }), layoutSave === 'saving' && _jsx("p", { role: "status", children: text('正在保存窗口大小…', 'Saving window size…') }), typeof layoutSave === 'object' && layoutSave !== null && _jsx("p", { role: "alert", children: renderWebChatMessage(layoutSave.error, text) })] }), _jsxs("div", { className: "dsh-webchat-reference-action", children: [_jsx("span", { title: state.referenceTarget?.title, children: state.referenceTarget === undefined ? text('请先打开 DSH 主会话', 'Open a DSH conversation first')
                                    : text(`添加到：${state.referenceTarget.title || '当前主会话'}`, `Add to: ${state.referenceTarget.title || 'Current conversation'}`) }), _jsx("button", { type: "button", disabled: state.busy || state.pending !== undefined
                                    || state.currentUrl === undefined || state.referenceTarget === undefined, onClick: () => { void controller.addToDsh(); }, children: text('添加到 DSH', 'Add to DSH') })] }), loginMessage && _jsx("div", { className: "dsh-webchat-notice", children: _jsx("p", { role: "status", children: renderWebChatMessage(loginMessage, text) }) }), (state.message !== undefined || state.pending !== undefined) && (_jsxs("div", { className: "dsh-webchat-notice", children: [state.message !== undefined && _jsx("p", { role: "status", children: renderWebChatMessage(state.message, text) }), state.pending !== undefined && (_jsxs("div", { className: "dsh-webchat-notice-actions", children: [state.pending.reason === 'login-required' && (_jsx("button", { type: "button", disabled: state.busy, onClick: () => { setView('chat'); void controller.resume(); }, children: text('登录后继续', 'Continue after signing in') })), _jsx("button", { type: "button", disabled: state.busy, onClick: () => { controller.cancelPending(); }, children: text('取消待办', 'Cancel pending action') })] }))] })), _jsxs("div", { className: "dsh-webchat-content", children: [_jsx("div", { ref: container, className: "dsh-webchat-guest", "aria-label": text('DeepSeek 网页', 'DeepSeek website'), style: { display: view === 'chat' ? 'flex' : 'none' } }), _jsxs("section", { className: "dsh-webchat-history dsh-webchat-page", "aria-label": text('网页聊天历史', 'Web chat history'), style: { display: view === 'history' ? 'block' : 'none' }, children: [_jsx("h3", { children: text('最近打开的聊天', 'Recently opened chats') }), _jsx("p", { className: "dsh-webchat-description", children: text('点击继续网页聊天。完整聊天记录仍保存在 DeepSeek 账号中。', 'Open a chat to continue. Full conversations remain saved in your DeepSeek account.') }), state.history.length === 0
                                        ? _jsx("p", { className: "dsh-webchat-empty", children: text('还没有网页聊天历史。', 'No web chat history yet.') })
                                        : _jsx("ul", { className: "dsh-webchat-history-list", children: state.history.map(item => (_jsx("li", { children: _jsxs("button", { type: "button", disabled: state.busy, "aria-current": state.currentUrl === item.url ? 'page' : undefined, onClick: () => { setView('chat'); void controller.openHistory(item.url); }, children: [_jsx("span", { className: "dsh-webchat-history-title", children: item.title || 'DeepSeek Chat' }), _jsx("time", { dateTime: new Date(item.updatedAt).toISOString(), children: new Date(item.updatedAt).toLocaleString(text('zh-CN', 'en-US'), {
                                                                month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                                            }) })] }) }, item.url))) })] }), _jsx("section", { className: "dsh-webchat-page", "aria-label": text('更多详情提示词设置', 'More details prompt settings'), style: { display: view === 'settings' ? 'block' : 'none' }, children: _jsx(MoreDetailsSettings, { locale: locale, usePromptSettings: usePromptSettings, savePrompt: prompt => form.set('defaultPrompt', prompt), resetPrompt: () => form.unset('defaultPrompt') }) })] })] }), state.hasOpened && !state.visible && (_jsx("button", { type: "button", className: "dsh-webchat-restore", "data-side-chat-panel": "", onClick: showChat, "aria-label": text('展开 DeepSeek Chat', 'Open DeepSeek Chat'), children: "DeepSeek Chat" }))] }));
}
/** 侧栏入口单独订阅语言，切换时不重新创建聊天控制器。 */
export function WebChatLauncher({ controller, locale, wide }) {
    const { text } = useDshLocale(locale);
    return _jsx("button", { type: "button", className: "dsh-webchat-launcher", title: text('新建 DeepSeek 网页聊天', 'New DeepSeek web chat'), "aria-label": text('新建 Chat', 'New Chat'), onClick: () => { void controller.newChat(); }, children: wide ? text('＋ 新建 Chat', '＋ New Chat') : '＋' });
}
