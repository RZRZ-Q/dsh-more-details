import { Context } from '@deepseek-ai/cordis'
import { credentialKey, type CredentialKey, type CredentialRecord } from '@deepseek-ai/dsh-credentials'
import { describe, expect, it, vi } from 'vitest'
import { Config, DshSideChatPlugin } from '../../src/index.js'
import { CredentialWebChatLoginStore } from '../../src/host/webchat-login-store.js'
import { parseWebChatLoginState, type WebChatLoginState } from '../../src/shared/webchat-login.js'
import { SIDE_CHAT_INVOCATIONS } from '../../src/typert.js'

const key = credentialKey('dsh-more-details', 'webchat')
const state: WebChatLoginState = {
  userToken: '{"value":"test-token-仅用于测试","__version":"1"}',
  userInfo: '{"value":{"id":"test-user"},"__version":"1"}',
  deviceId: 'test-device',
}
function fixture() {
  const records = new Map<CredentialKey, CredentialRecord>()
  const credentials = {
    readRecord: vi.fn(async (key: CredentialKey) => records.get(key)),
    modifyRecord: vi.fn(async (key: CredentialKey, mutate: (record: CredentialRecord | undefined) => Promise<CredentialRecord | undefined>) => {
      const replacement = await mutate(records.get(key))
      if (replacement !== undefined) records.set(key, JSON.parse(JSON.stringify(replacement)) as CredentialRecord)
      return records.get(key)
    }),
    deleteRecord: vi.fn(async (key: CredentialKey) => { records.delete(key) }),
  }
  return { records, credentials, store: new CredentialWebChatLoginStore(credentials) }
}

describe('网页登录状态 Host 存储', () => {
  it('通过官方 record API 原样往返三个字符串，新实例可恢复且支持可选值缺失', async () => {
    const f = fixture()
    expect(await f.store.read()).toBeNull()
    await f.store.save(state)
    expect(f.records.get(key)).toEqual({ kind: 'grant', payload: state })
    expect(await new CredentialWebChatLoginStore(f.credentials).read()).toEqual(state)
    await f.store.save({ ...state, userInfo: null, deviceId: null })
    expect(await f.store.read()).toEqual({ ...state, userInfo: null, deviceId: null })
    expect(f.credentials.readRecord.mock.calls.every(([requested]) => requested === key)).toBe(true)
    expect(f.credentials.modifyRecord.mock.calls.every(([requested]) => requested === key)).toBe(true)
  })

  it('兼容旧三字段记录并原样保存官网语言，新实例与严格 RPC codec 都保留该字段', async () => {
    const f = fixture()
    f.records.set(key, { kind: 'grant', payload: state })
    expect(await f.store.read()).toEqual(state)
    for (const localePreference of ['{ "value" : "zh_CN", "__version" : "0" }', '"en_US"',
      '{"value":"system","__version":"0"}']) {
      const withLocale = { ...state, localePreference }
      await f.store.save(withLocale)
      expect(await new CredentialWebChatLoginStore(f.credentials).read()).toEqual(withLocale)
      const descriptor = SIDE_CHAT_INVOCATIONS.find(value => value.method === 'saveWebChatLogin')!
      const request = descriptor.parameters[0]?.codec
      if (request?.mode !== 'strict') throw new Error('缺少严格 codec')
      expect(request.create().parse({ state: withLocale })).toEqual({ state: withLocale })
    }
  })

  it('清除可重复调用，始终只操作本插件记录，不清除 DSH 模型账号或其他插件凭据', async () => {
    const f = fixture()
    const otherKey = credentialKey('deepseek-account-platform', 'default')
    const other: CredentialRecord = { kind: 'grant', payload: { untouched: true } }
    f.records.set(otherKey, other)
    await f.store.save(state)
    await f.store.clear()
    await f.store.clear()
    expect(await f.store.read()).toBeNull()
    expect(f.records.get(otherKey)).toEqual(other)
    expect(f.credentials.deleteRecord.mock.calls).toEqual([[key], [key]])
  })

  it('拒绝非白名单和超量凭据，不写入或在错误中回显输入', async () => {
    const f = fixture()
    for (const invalid of [
      { ...state, SECRET_FIELD_MARKER: 'SECRET_VALUE_MARKER' },
      { ...state, userToken: '' },
      { ...state, userToken: ' '.repeat(3) },
      { ...state, userToken: 'x'.repeat(16 * 1024 + 1) },
      { ...state, userInfo: 'x'.repeat(64 * 1024 + 1) },
      { ...state, deviceId: 'x'.repeat(4 * 1024 + 1) },
      { ...state, localePreference: 'x'.repeat(129) },
      { ...state, localePreference: '"invalid locale"' },
      { ...state, localePreference: '{"value":"zh_CN","__version":"1"}' },
      { ...state, localePreference: '{"value":"zh_CN","__version":"0","extra":true}' },
      { ...state, localePreference: 'null' },
    ]) {
      await expect(f.store.save(invalid)).rejects.toThrow('网页登录数据格式无效。')
      try { parseWebChatLoginState(invalid) } catch (error) {
        expect(String(error)).not.toMatch(/SECRET_|test-token|test-user/)
      }
    }
    expect(f.credentials.modifyRecord).not.toHaveBeenCalled()
  })

  it('读取损坏记录和存储服务故障明确失败，错误不带底层凭据', async () => {
    const f = fixture()
    f.records.set(key, { kind: 'api-key', key: 'SECRET_VALUE_MARKER' })
    await expect(f.store.read()).rejects.toThrow('无法读取已保存的网页登录状态。')
    f.records.set(key, { kind: 'grant', payload: { userToken: 'SECRET_VALUE_MARKER' } })
    await expect(f.store.read()).rejects.toThrow('无法读取已保存的网页登录状态。')
    f.credentials.readRecord.mockRejectedValueOnce(new Error('SECRET_VALUE_MARKER'))
    f.credentials.modifyRecord.mockRejectedValueOnce(new Error('SECRET_VALUE_MARKER'))
    f.credentials.deleteRecord.mockRejectedValueOnce(new Error('SECRET_VALUE_MARKER'))
    await expect(f.store.read()).rejects.toThrow('无法读取已保存的网页登录状态。')
    await expect(f.store.save(state)).rejects.toThrow('无法保存网页登录状态。')
    await expect(f.store.clear()).rejects.toThrow('无法清除已保存的网页登录状态。')
  })

  it('Host RPC 完成读写清除，并将存储故障转换为不含凭据的结果', async () => {
    const f = fixture()
    const ctx = new Context()
    ctx.provide('credentials', f.credentials as unknown as Context['credentials'])
    const plugin = new DshSideChatPlugin(ctx, Config({}))
    try {
      expect(await plugin.readWebChatLogin({})).toEqual({ ok: true, value: { state: null } })
      expect(await plugin.saveWebChatLogin({ state })).toEqual({ ok: true, value: { saved: true } })
      expect(await plugin.readWebChatLogin({})).toEqual({ ok: true, value: { state } })
      expect(await plugin.clearWebChatLogin({})).toEqual({ ok: true, value: { cleared: true } })
      f.credentials.readRecord.mockRejectedValueOnce(new Error('SECRET_VALUE_MARKER'))
      expect(await plugin.readWebChatLogin({})).toEqual({ ok: false, error: {
        code: 'internal_error', message: '无法读取已保存的网页登录状态。', recoverable: true,
      } })
    } finally {
      await plugin.conversations.dispose()
      await ctx.fiber.dispose()
    }
  })

  it('三个 Typert RPC 的严格 codec 拒绝额外输入并支持正确的返回结果', () => {
    const cases = [
      { method: 'readWebChatLogin', request: {}, result: { ok: true, value: { state } } },
      { method: 'saveWebChatLogin', request: { state }, result: { ok: true, value: { saved: true } } },
      { method: 'clearWebChatLogin', request: {}, result: { ok: true, value: { cleared: true } } },
    ]
    for (const item of cases) {
      const descriptor = SIDE_CHAT_INVOCATIONS.find(value => value.method === item.method)!
      const request = descriptor.parameters[0]?.codec
      if (request?.mode !== 'strict' || descriptor.result.mode !== 'strict') throw new Error('缺少严格 codec')
      expect(request.create().parse(item.request)).toEqual(item.request)
      expect(descriptor.result.create().parse(item.result)).toEqual(item.result)
      expect(() => request.create().parse({ ...item.request, SECRET_FIELD_MARKER: 'SECRET_VALUE_MARKER' }))
        .toThrow('网页登录数据格式无效。')
    }
  })
})
