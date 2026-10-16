import { isWebChatLocalePreference } from '../../shared/webchat-login.js';
/** 序列化到官网 guest；只搬运登录与语言白名单，不请求账号接口，也不修改官网认证逻辑。 */
function operateDeepSeekLogin(command, validLocale) {
    if (location.origin !== 'https://chat.deepseek.com') {
        return command.type === 'read' ? { status: 'wrong-origin', state: null } : { status: 'wrong-origin' };
    }
    // 官网公开 main.6fca03582d.js 的 StorageHandle（91805）使用 {value,__version}，
    // userToken 的版本为 "0"，并兼容尚未包装的 JSON 字符串。仅解析判断，不改写原始值。
    const tokenValue = (raw) => {
        if (raw === null)
            return null;
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'string')
                return parsed.trim() ? parsed : null;
            if (typeof parsed !== 'object' || parsed === null || !('value' in parsed)
                || !('__version' in parsed) || parsed.__version !== '0')
                return null;
            return typeof parsed.value === 'string' && parsed.value.trim() ? parsed.value : null;
        }
        catch {
            return null;
        }
    };
    const authenticatedUI = () => {
        if (!/^\/(?:a\/[\w-]+(?:\/s\/[\w-]+)?\/?)?$/.test(location.pathname))
            return false;
        const visible = (element) => {
            if (element.closest('[hidden], [aria-hidden="true"], .ds-message'))
                return false;
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        for (const selector of ['textarea.ds-textarea__textarea', 'textarea[placeholder]', 'textarea']) {
            const inputs = Array.from(document.querySelectorAll(selector)).filter(visible);
            if (inputs.length > 0)
                return inputs.length === 1;
        }
        return false;
    };
    const currentRaw = localStorage.getItem('userToken');
    const currentToken = tokenValue(currentRaw);
    const localeKey = '__appKit_@deepseek/chat_localePreference';
    if (command.type === 'read') {
        if (currentRaw !== null && currentToken !== null && authenticatedUI()) {
            const localePreference = localStorage.getItem(localeKey);
            if (localePreference !== null && !validLocale(localePreference))
                throw new Error('网页语言设置格式无效。');
            return { status: 'authenticated', state: { userToken: currentRaw,
                    userInfo: localStorage.getItem('__appKit_userInfo'), deviceId: localStorage.getItem('deepseek-device-id:chat'),
                    ...(localePreference === null ? {} : { localePreference }) } };
        }
        return { status: /^\/sign_in\/?$/.test(location.pathname) && currentToken === null ? 'signed-out' : 'loading', state: null };
    }
    const state = command.state;
    if (typeof state?.userToken !== 'string' || tokenValue(state.userToken) === null
        || !(state.userInfo === null || typeof state.userInfo === 'string')
        || !(state.deviceId === null || typeof state.deviceId === 'string')
        || (Object.hasOwn(state, 'localePreference') && !validLocale(state.localePreference)))
        return { status: 'invalid-state' };
    // 包括另一个账号正在初始化的情况，避免后台恢复覆盖用户刚完成的登录。
    if (currentToken !== null && currentToken !== tokenValue(state.userToken))
        return { status: 'existing-token' };
    if (currentToken !== null && authenticatedUI()) {
        if (state.localePreference === undefined || localStorage.getItem(localeKey) === state.localePreference) {
            return { status: 'already-authenticated' };
        }
        // 官网在首次加载时已写入 system；恢复保存的明确偏好后仍须由 guest 重新加载。
        localStorage.setItem(localeKey, state.localePreference);
        return { status: 'restored' };
    }
    for (const [key, value] of [
        ['userToken', state.userToken], ['__appKit_userInfo', state.userInfo], ['deepseek-device-id:chat', state.deviceId],
    ]) {
        if (value === null)
            localStorage.removeItem(key);
        else
            localStorage.setItem(key, value);
    }
    if (state.localePreference !== undefined)
        localStorage.setItem(localeKey, state.localePreference);
    return { status: 'restored' };
}
export function deepSeekReadLoginScript() {
    return `(${operateDeepSeekLogin.toString()})(${JSON.stringify({ type: 'read' })}, ${isWebChatLocalePreference.toString()})`;
}
export function deepSeekRestoreLoginScript(state) {
    return `(${operateDeepSeekLogin.toString()})(${JSON.stringify({ type: 'restore', state })}, ${isWebChatLocalePreference.toString()})`;
}
