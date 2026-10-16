import { credentialKey } from '@deepseek-ai/dsh-credentials';
import { parseWebChatLoginState } from '../shared/webchat-login.js';
const WEBCHAT_LOGIN_KEY = credentialKey('dsh-more-details', 'webchat');
/** 持久化由 DSH 凭据服务负责，只读写本插件自己的记录。 */
export class CredentialWebChatLoginStore {
    credentials;
    constructor(credentials) {
        this.credentials = credentials;
    }
    async read() {
        try {
            const record = await this.credentials.readRecord(WEBCHAT_LOGIN_KEY);
            if (record === undefined)
                return null;
            if (record.kind !== 'grant')
                throw new Error('网页登录记录类型无效。');
            return parseWebChatLoginState(record.payload);
        }
        catch {
            throw new Error('无法读取已保存的网页登录状态。');
        }
    }
    async save(state) {
        const payload = parseWebChatLoginState(state);
        try {
            await this.credentials.modifyRecord(WEBCHAT_LOGIN_KEY, async () => ({ kind: 'grant', payload }));
        }
        catch {
            throw new Error('无法保存网页登录状态。');
        }
    }
    async clear() {
        try {
            await this.credentials.deleteRecord(WEBCHAT_LOGIN_KEY);
        }
        catch {
            throw new Error('无法清除已保存的网页登录状态。');
        }
    }
}
