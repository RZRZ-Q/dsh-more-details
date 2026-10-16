/** 官网 StorageHandle 的语言格式；此函数也会序列化到隔离的官网页面。 */
export function isWebChatLocalePreference(value) {
    if (typeof value !== 'string' || value.length > 128)
        return false;
    try {
        const parsed = JSON.parse(value);
        let locale = parsed;
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            if (Object.keys(parsed).length !== 2 || !('value' in parsed) || !('__version' in parsed)
                || parsed.__version !== '0')
                return false;
            locale = parsed.value;
        }
        return typeof locale === 'string' && /^(?:system|[a-z]{2,3}(?:_[A-Za-z]{2,4})?)$/.test(locale);
    }
    catch {
        return false;
    }
}
export function isWebChatLoginState(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const record = value;
    const hasLocale = Object.hasOwn(record, 'localePreference');
    return Object.keys(record).length === (hasLocale ? 4 : 3)
        && Object.hasOwn(record, 'userToken') && Object.hasOwn(record, 'userInfo') && Object.hasOwn(record, 'deviceId')
        && typeof record.userToken === 'string' && /\S/u.test(record.userToken) && record.userToken.length <= 16 * 1024
        && (record.userInfo === null || typeof record.userInfo === 'string' && record.userInfo.length <= 64 * 1024)
        && (record.deviceId === null || typeof record.deviceId === 'string' && record.deviceId.length <= 4 * 1024)
        && (!hasLocale || isWebChatLocalePreference(record.localePreference));
}
export function parseWebChatLoginState(value) {
    if (!isWebChatLoginState(value))
        throw new Error('网页登录数据格式无效。');
    return { userToken: value.userToken, userInfo: value.userInfo, deviceId: value.deviceId,
        ...(value.localePreference === undefined ? {} : { localePreference: value.localePreference }) };
}
