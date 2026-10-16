import { credentialKey, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { parseWebChatLoginState, type WebChatLoginState, type WebChatLoginStore } from '../shared/webchat-login.js'

const WEBCHAT_LOGIN_KEY = credentialKey('dsh-more-details', 'webchat')
type LoginCredentials = Pick<CredentialProvider, 'readRecord' | 'modifyRecord' | 'deleteRecord'>

/** 持久化由 DSH 凭据服务负责，只读写本插件自己的记录。 */
export class CredentialWebChatLoginStore implements WebChatLoginStore {
  constructor(private readonly credentials: LoginCredentials) {}

  async read(): Promise<WebChatLoginState | null> {
    try {
      const record = await this.credentials.readRecord(WEBCHAT_LOGIN_KEY)
      if (record === undefined) return null
      if (record.kind !== 'grant') throw new Error('网页登录记录类型无效。')
      return parseWebChatLoginState(record.payload)
    } catch {
      throw new Error('无法读取已保存的网页登录状态。')
    }
  }

  async save(state: WebChatLoginState): Promise<void> {
    const payload = parseWebChatLoginState(state)
    try {
      await this.credentials.modifyRecord(WEBCHAT_LOGIN_KEY, async () => ({ kind: 'grant', payload }))
    } catch {
      throw new Error('无法保存网页登录状态。')
    }
  }

  async clear(): Promise<void> {
    try {
      await this.credentials.deleteRecord(WEBCHAT_LOGIN_KEY)
    } catch {
      throw new Error('无法清除已保存的网页登录状态。')
    }
  }
}
