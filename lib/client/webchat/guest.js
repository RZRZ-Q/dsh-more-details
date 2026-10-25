import { deepSeekNewChatScript, deepSeekProbeScript, deepSeekReceiptScript, deepSeekSendScript, } from './deepseek-page.js';
import { WEB_CHAT_DESKTOP_REQUIRED, WebChatMessageError } from './messages.js';
import { deepSeekCaptureScript } from './deepseek-capture.js';
import { deepSeekReadLoginScript, deepSeekRestoreLoginScript, } from './login-page.js';
const HOME = 'https://chat.deepseek.com/';
/** 在注册入口和真正创建 guest 时检查宿主能力；Web 渲染器也会在普通浏览器中加载。 */
export function webChatBrowserBridge() {
    const desktop = globalThis.dshDesktop;
    const browser = desktop?.browser;
    return desktop?.protocolVersion === 1
        && typeof browser?.acquire === 'function'
        && typeof browser.release === 'function'
        && typeof browser.onOpenRequested === 'function'
        ? browser : undefined;
}
function loginRequired() {
    return Object.assign(new WebChatMessageError({ zh: '请先在小窗内登录 DeepSeek 网页账号，然后点击“登录后继续”。', en: 'Sign in to your DeepSeek web account in this window, then click “Continue after signing in”.' }), { code: 'login-required' });
}
function blockedAction(reason, fallback) {
    if (reason === 'login-required')
        return loginRequired();
    const messages = {
        'wrong-origin': { zh: '当前页面不是 DeepSeek 官网，请重新打开网页聊天。', en: 'This is not the official DeepSeek website. Reopen Web Chat.' },
        'target-changed': { zh: '网页已切换，未发送本次请求。请重新选择目标聊天。', en: 'The webpage changed, so this request was not sent. Select the intended chat again.' },
        'page-not-ready': { zh: '网页尚未就绪，请等待页面加载完成。', en: 'The webpage is not ready. Wait for it to finish loading.' },
        generating: { zh: '当前网页仍在回答，请等回答完成或在网页中停止生成。', en: 'The webpage is still generating a response. Wait for it to finish or stop generation on the webpage.' },
        'draft-present': { zh: '网页输入框中已有未发送的内容，请先处理该草稿。', en: 'The webpage composer contains an unsent draft. Handle that draft first.' },
        'new-chat-unavailable': { zh: '没有找到网页的新聊天入口。', en: 'Could not find the webpage’s new chat control.' },
        'empty-request': { zh: '待发送内容为空。', en: 'The message to send is empty.' },
        'messages-unsupported': { zh: '暂时无法辨认网页消息，未发送本次请求。', en: 'Could not identify the webpage messages. This request was not sent.' },
        'composer-unavailable': { zh: '网页输入框暂时不可用，请检查页面状态。', en: 'The webpage composer is unavailable. Check the page.' },
        'composer-changed': { zh: '网页草稿已变化，未发送本次请求。', en: 'The webpage draft changed. This request was not sent.' },
    };
    return new WebChatMessageError(reason === null ? fallback : messages[reason] ?? fallback);
}
/** 官方临时 guest + 插件专用凭据：只保存官网登录白名单，不保存 Cookie 或整个浏览器资料。 */
export class DeepSeekGuest {
    loginStore;
    element;
    reservation;
    bridge;
    opening;
    disposed = false;
    poll;
    unsubscribe;
    probing = false;
    container;
    lastFailure;
    preparedUrl;
    onPage = () => { };
    loginMessage = '';
    accessibleLabel = 'DeepSeek Web Chat';
    loginListeners = new Set();
    lastSavedLogin = null;
    canClearLogin = false;
    constructor(loginStore) {
        this.loginStore = loginStore;
    }
    getLoginMessage = () => this.loginMessage;
    subscribeLogin = (listener) => {
        this.loginListeners.add(listener);
        return () => { this.loginListeners.delete(listener); };
    };
    setLoginMessage(message) {
        if (this.disposed || JSON.stringify(this.loginMessage) === JSON.stringify(message))
            return;
        this.loginMessage = message;
        for (const listener of this.loginListeners)
            listener();
    }
    setAccessibleLabel(label) {
        this.accessibleLabel = label;
        this.element?.setAttribute('aria-label', label);
    }
    attach(container) { this.container = container; }
    observe(listener) { this.onPage = listener; }
    assertLive() {
        if (this.disposed)
            throw new WebChatMessageError({ zh: 'Web Chat 插件已卸载。', en: 'The Web Chat plugin has been unloaded.' });
    }
    async ensure() {
        this.assertLive();
        this.opening ??= this.createGuest().catch(async (error) => {
            try {
                await this.releaseGuest();
            }
            finally {
                this.opening = undefined;
            }
            throw error;
        });
        await this.opening;
        this.assertLive();
    }
    async createGuest() {
        this.lastFailure = undefined;
        this.preparedUrl = undefined;
        const browser = webChatBrowserBridge();
        if (browser === undefined)
            throw new WebChatMessageError(WEB_CHAT_DESKTOP_REQUIRED);
        if (this.container === undefined)
            throw new WebChatMessageError({ zh: 'Web Chat 面板尚未挂载。', en: 'The Web Chat panel is not mounted yet.' });
        this.bridge = browser;
        const reservation = await browser.acquire('dsh-more-details-webchat');
        if (this.disposed) {
            await browser.release(reservation.lease);
            return;
        }
        this.reservation = reservation;
        const element = document.createElement('webview');
        this.element = element;
        element.setAttribute('name', reservation.lease);
        element.setAttribute('partition', reservation.partition);
        element.setAttribute('src', `about:blank#${reservation.lease}`);
        element.setAttribute('aria-label', this.accessibleLabel);
        element.setAttribute('allowpopups', '');
        const ready = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new WebChatMessageError({ zh: 'DSH 浏览器组件未能启动。', en: 'The DSH browser component could not start.' })), 15000);
            element.addEventListener('dom-ready', () => { clearTimeout(timeout); resolve(); }, { once: true });
        });
        element.addEventListener('did-fail-load', event => {
            const failure = event;
            if (failure.isMainFrame && failure.errorCode !== -3)
                this.lastFailure = failure.errorDescription;
        });
        for (const event of ['did-navigate', 'did-navigate-in-page', 'did-finish-load']) {
            element.addEventListener(event, () => {
                // 恢复尚未结束时不能采集空白登录页；之后及时跟随官网登录与注销。
                if (this.poll !== undefined)
                    void this.observeNow();
            });
        }
        this.unsubscribe = browser.onOpenRequested(reservation.lease, url => {
            if (new URL(url).origin === new URL(HOME).origin) {
                void element.loadURL(url).catch(error => { this.lastFailure = String(error); });
            }
        });
        this.container.append(element);
        await ready;
        this.assertLive();
        let saved = null;
        this.canClearLogin = false;
        try {
            saved = await this.loginStore.read();
            this.lastSavedLogin = saved === null ? null : JSON.stringify(saved);
            this.canClearLogin = true;
        }
        catch {
            this.setLoginMessage({ zh: '无法读取已保存的登录，请在网页中登录。', en: 'Could not read the saved sign-in. Sign in on the webpage.' });
        }
        this.assertLive();
        await element.loadURL(HOME);
        this.assertLive();
        if (saved !== null) {
            this.setLoginMessage({ zh: '正在恢复网页登录…', en: 'Restoring your web sign-in…' });
            const restored = await element.executeJavaScript(deepSeekRestoreLoginScript(saved));
            this.assertLive();
            if (restored.status === 'restored') {
                // 官网在启动时读取登录数据；写入后必须重新加载，交由官网验证令牌。
                await element.loadURL(HOME);
                this.assertLive();
            }
            else if (restored.status === 'wrong-origin' || restored.status === 'invalid-state') {
                this.canClearLogin = false;
                this.setLoginMessage({ zh: '未能恢复已保存的登录，请在网页中登录。', en: 'Could not restore the saved sign-in. Sign in on the webpage.' });
            }
        }
        await this.syncLogin();
        this.assertLive();
        this.poll = setInterval(() => { void this.observeNow(); }, 1500);
    }
    async syncLogin() {
        const element = this.element;
        if (this.disposed || element === undefined)
            return;
        let state;
        try {
            state = await element.executeJavaScript(deepSeekReadLoginScript());
        }
        catch {
            this.setLoginMessage({ zh: '暂时无法检查网页登录，下次检查会继续。', en: 'Could not check your web sign-in right now. It will be checked again.' });
            return;
        }
        if (this.disposed)
            return;
        if (state.status === 'authenticated' && state.state !== null) {
            const serialized = JSON.stringify(state.state);
            try {
                if (serialized !== this.lastSavedLogin)
                    await this.loginStore.save(state.state);
                if (this.disposed)
                    return;
                this.lastSavedLogin = serialized;
                this.canClearLogin = true;
                this.setLoginMessage({ zh: '已记住网页登录，重启后自动恢复。', en: 'Web sign-in remembered. It will be restored after restart.' });
            }
            catch {
                this.setLoginMessage({ zh: '无法保存网页登录，重启后需重新登录。', en: 'Could not save your web sign-in. You will need to sign in again after restart.' });
            }
        }
        else if (state.status === 'signed-out' && this.canClearLogin) {
            try {
                if (this.lastSavedLogin !== null)
                    await this.loginStore.clear();
                if (this.disposed)
                    return;
                this.lastSavedLogin = null;
                this.setLoginMessage({ zh: '请在网页中登录；成功后会记住登录。', en: 'Sign in on the webpage. Your sign-in will then be remembered.' });
            }
            catch {
                this.setLoginMessage({ zh: '未能清除已失效的登录，请稍后重试。', en: 'Could not clear the expired sign-in. Try again later.' });
            }
        }
    }
    async observeNow() {
        if (this.disposed || this.probing || this.element === undefined)
            return;
        this.probing = true;
        try {
            await this.probe();
            await this.syncLogin();
        }
        catch (error) {
            this.lastFailure = error instanceof Error ? error.message : String(error);
        }
        finally {
            this.probing = false;
        }
    }
    async probe() {
        this.assertLive();
        const page = await this.element.executeJavaScript(deepSeekProbeScript());
        this.assertLive();
        this.onPage(page);
        return page;
    }
    async waitFor(predicate, timeout = 25000) {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            const page = await this.probe();
            if (page.login === 'required')
                throw loginRequired();
            if (predicate(page))
                return page;
            if (this.lastFailure !== undefined)
                throw new WebChatMessageError({ zh: `网页加载失败：${this.lastFailure}`, en: `The webpage failed to load: ${this.lastFailure}` });
            await new Promise(resolve => setTimeout(resolve, 350));
        }
        throw new WebChatMessageError({ zh: '网页尚未就绪，请查看小窗中的页面状态。', en: 'The webpage is not ready. Check the page in this window.' });
    }
    async newChat() {
        await this.ensure();
        const before = await this.waitFor(page => page.login === 'ready' && page.composerPresent);
        if (before.generating)
            throw new WebChatMessageError({ zh: '当前网页仍在回答，请等回答完成或在网页中停止生成。', en: 'The webpage is still generating a response. Wait for it to finish or stop generation on the webpage.' });
        const action = await this.element.executeJavaScript(deepSeekNewChatScript(before.url), true);
        if (action.status === 'blocked')
            throw blockedAction(action.reason, { zh: '没有找到网页的新聊天入口。', en: 'Could not find the webpage’s new chat control.' });
        const blank = await this.waitFor(page => page.login === 'ready' && page.conversationId === null && page.composerEmpty && page.messages.length === 0);
        this.preparedUrl = blank.url;
    }
    async send(prompt, expectedUrl) {
        await this.ensure();
        const page = await this.waitFor(value => value.login === 'ready' && value.composerPresent);
        const target = expectedUrl ?? this.preparedUrl;
        if (target === undefined || page.url !== target)
            throw new WebChatMessageError({ zh: '网页已切换，未发送本次请求。请重新选择目标聊天。', en: 'The webpage changed, so this request was not sent. Select the intended chat again.' });
        const requestId = crypto.randomUUID();
        const action = await this.element.executeJavaScript(deepSeekSendScript({ requestId, text: prompt, expectedUrl: target }), true);
        if (action.status === 'blocked')
            throw blockedAction(action.reason, { zh: '网页未接受发送操作。', en: 'The webpage did not accept the send action.' });
        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
            this.assertLive();
            const receipt = await this.element.executeJavaScript(deepSeekReceiptScript(requestId));
            if (receipt.status === 'accepted') {
                await this.probe();
                return { url: receipt.snapshot.url, title: receipt.snapshot.title || 'DeepSeek Chat' };
            }
            if (receipt.status === 'target-changed' || receipt.status === 'unknown')
                throw new WebChatMessageError({ zh: '发送目标发生变化，结果未确认。', en: 'The destination chat changed. Sending is unconfirmed.' });
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        throw new WebChatMessageError({ zh: '未能确认网页收到这条消息，请查看聊天内容；不会自动重复发送。', en: 'Could not confirm that the webpage received this message. Check the chat; it will not be sent again automatically.' });
    }
    async open(url) {
        if (new URL(url).origin !== new URL(HOME).origin)
            throw new WebChatMessageError({ zh: '只能打开 DeepSeek 网页聊天。', en: 'Only DeepSeek Web Chat pages can be opened.' });
        await this.ensure();
        this.lastFailure = undefined;
        await this.element.loadURL(url);
        await this.waitFor(page => page.login === 'ready' && page.url.split(/[?#]/)[0] === url && page.composerPresent);
    }
    async capture() {
        this.assertLive();
        const element = this.element;
        if (element === undefined)
            throw new WebChatMessageError({ zh: '请先打开要引用的网页聊天。', en: 'Open the Web Chat you want to reference first.' });
        // 引用只读当前 guest，不初始化网页、恢复登录或改变当前聊天。
        const expectedUrl = element.getURL().split(/[?#]/)[0].replace(/\/$/, '');
        const result = await element.executeJavaScript(deepSeekCaptureScript(expectedUrl));
        this.assertLive();
        if (this.element !== element || element.getURL().split(/[?#]/)[0].replace(/\/$/, '') !== expectedUrl) {
            throw new WebChatMessageError({ zh: '网页已切换，请确认目标聊天后重新添加。', en: 'The webpage changed. Check the intended chat and add it again.' });
        }
        if (!result.ok)
            throw new WebChatMessageError(result.reason);
        return result.capture;
    }
    async dispose() {
        this.disposed = true;
        this.loginListeners.clear();
        this.lastSavedLogin = null;
        await this.releaseGuest();
    }
    async releaseGuest() {
        if (this.poll !== undefined)
            clearInterval(this.poll);
        this.poll = undefined;
        this.unsubscribe?.();
        this.unsubscribe = undefined;
        const element = this.element;
        const reservation = this.reservation;
        this.element = undefined;
        this.reservation = undefined;
        element?.remove();
        if (reservation !== undefined)
            await this.bridge.release(reservation.lease);
    }
}
