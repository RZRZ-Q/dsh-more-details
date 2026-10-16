// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chat.deepseek.com"}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deepSeekReadLoginScript, deepSeekRestoreLoginScript,
  type DeepSeekLoginReadResult, type DeepSeekLoginRestoreResult,
} from '../../src/client/webchat/login-page.js'
import type { WebChatLoginState } from '../../src/shared/webchat-login.js'

// 只使用人工构造的凭据，实际执行送入 guest 的脚本，覆盖序列化后的隔离环境。
const state: WebChatLoginState = {
  userToken: '{ "value" : "test-token", "__version" : "0" }',
  userInfo: '{ "value" : { "id" : "test-user" }, "__version" : "0" }',
  deviceId: 'test-device-id',
}
const localeKey = '__appKit_@deepseek/chat_localePreference'
const chineseLocale = '{ "value" : "zh_CN", "__version" : "0" }'
function read(): DeepSeekLoginReadResult { return window.eval(deepSeekReadLoginScript()) as DeepSeekLoginReadResult }
function restore(value = state): DeepSeekLoginRestoreResult {
  return window.eval(deepSeekRestoreLoginScript(value)) as DeepSeekLoginRestoreResult
}
function showComposer(): void { document.body.innerHTML = '<textarea class="ds-textarea__textarea"></textarea>' }

beforeEach(() => {
  history.replaceState(null, '', '/')
  // Node 25 自带 localStorage 会遮住 JSDOM；本测试使用浏览器环境自己的 Storage。
  const dom = (globalThis as typeof globalThis & { jsdom: { window: Window } }).jsdom
  vi.stubGlobal('localStorage', dom.window.localStorage)
  localStorage.clear()
  document.body.innerHTML = ''
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 100,
    bottom: 30, width: 100, height: 30, toJSON: () => ({}) })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('DeepSeek 登录态白名单搬运', () => {
  it('原始包装字符串往返保持不变，不读取其他 storage 或 cookie', () => {
    expect(restore()).toEqual({ status: 'restored' })
    localStorage.setItem('unrelated-setting', 'private')
    showComposer()
    const get = vi.spyOn(Storage.prototype, 'getItem')
    const cookie = vi.spyOn(document, 'cookie', 'get')
    expect(read()).toEqual({ status: 'authenticated', state })
    expect(get.mock.calls.map(([key]) => key)).toEqual(['userToken', localeKey, '__appKit_userInfo', 'deepseek-device-id:chat'])
    expect(cookie).not.toHaveBeenCalled()
  })

  it('恢复只写白名单，nullable 字段删除旧值，其余网站设置保持原样', () => {
    localStorage.setItem('unrelated-setting', 'keep')
    localStorage.setItem('__appKit_userInfo', 'stale')
    localStorage.setItem('deepseek-device-id:chat', 'stale')
    const set = vi.spyOn(Storage.prototype, 'setItem')
    const remove = vi.spyOn(Storage.prototype, 'removeItem')
    const cookie = vi.spyOn(document, 'cookie', 'set')
    expect(restore({ ...state, userInfo: null, deviceId: null })).toEqual({ status: 'restored' })
    expect(set.mock.calls).toEqual([['userToken', state.userToken]])
    expect(remove.mock.calls).toEqual([['__appKit_userInfo'], ['deepseek-device-id:chat']])
    expect(localStorage.getItem('unrelated-setting')).toBe('keep')
    expect(cookie).not.toHaveBeenCalled()
  })

  it('语言偏好原样往返，新 guest 的默认 system 被保存值覆盖，旧记录保留网页现有语言', () => {
    const saved = { ...state, localePreference: chineseLocale }
    localStorage.setItem(localeKey, '{"value":"system","__version":"0"}')
    expect(restore(saved)).toEqual({ status: 'restored' })
    showComposer()
    expect(read()).toEqual({ status: 'authenticated', state: saved })
    localStorage.clear()
    document.body.innerHTML = ''
    localStorage.setItem(localeKey, '"en_US"')
    expect(restore()).toEqual({ status: 'restored' })
    expect(localStorage.getItem(localeKey)).toBe('"en_US"')
  })

  it('同账号已就绪时仅恢复不同语言并要求重载，相同语言不重复重载，不覆盖另一个账号', () => {
    const saved = { ...state, localePreference: chineseLocale }
    localStorage.setItem('userToken', state.userToken)
    localStorage.setItem(localeKey, '{"value":"system","__version":"0"}')
    showComposer()
    const set = vi.spyOn(Storage.prototype, 'setItem')
    expect(restore(saved)).toEqual({ status: 'restored' })
    expect(set.mock.calls).toEqual([[localeKey, chineseLocale]])
    set.mockClear()
    expect(restore(saved)).toEqual({ status: 'already-authenticated' })
    expect(set).not.toHaveBeenCalled()
    localStorage.setItem('userToken', '"another-account"')
    localStorage.setItem(localeKey, '"en_US"')
    set.mockClear()
    expect(restore(saved)).toEqual({ status: 'existing-token' })
    expect(set).not.toHaveBeenCalled()
    expect(localStorage.getItem(localeKey)).toBe('"en_US"')
  })

  it.each(['null', 'not-json', '"invalid locale"', '{"value":"zh_CN","__version":"1"}', ' '.repeat(129)])
  ('无效语言偏好不写入，采集时报明确错误，错误不回显内容', localePreference => {
    expect(restore({ ...state, localePreference })).toEqual({ status: 'invalid-state' })
    expect(localStorage.length).toBe(0)
    localStorage.setItem('userToken', state.userToken)
    localStorage.setItem(localeKey, localePreference)
    showComposer()
    expect(read).toThrow('网页语言设置格式无效。')
  })

  it.each(['https://example.com', 'http://chat.deepseek.com', 'https://chat.deepseek.com.evil.example'])
  ('非官网来源 %s 完全不读写 storage', origin => {
    vi.stubGlobal('location', { origin, pathname: '/' })
    const get = vi.spyOn(Storage.prototype, 'getItem')
    const set = vi.spyOn(Storage.prototype, 'setItem')
    const remove = vi.spyOn(Storage.prototype, 'removeItem')
    expect(read()).toEqual({ status: 'wrong-origin', state: null })
    expect(restore()).toEqual({ status: 'wrong-origin' })
    expect(get).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })

  it('已有不同有效 token 时，不覆盖已登录或仍在加载的新账号', () => {
    const current = JSON.stringify({ value: 'new-account-token', __version: '0' })
    localStorage.setItem('userToken', current)
    showComposer()
    const set = vi.spyOn(Storage.prototype, 'setItem')
    expect(restore()).toEqual({ status: 'existing-token' })
    document.body.innerHTML = ''
    expect(restore()).toEqual({ status: 'existing-token' })
    expect(set).not.toHaveBeenCalled()
    expect(localStorage.getItem('userToken')).toBe(current)
  })

  it('相同账号且界面已就绪不重写，尚未初始化则可恢复完整字段', () => {
    localStorage.setItem('userToken', JSON.stringify({ value: 'test-token', __version: '0' }))
    showComposer()
    const set = vi.spyOn(Storage.prototype, 'setItem')
    expect(restore()).toEqual({ status: 'already-authenticated' })
    expect(set).not.toHaveBeenCalled()
    document.body.innerHTML = ''
    expect(restore()).toEqual({ status: 'restored' })
    expect(localStorage.getItem('userToken')).toBe(state.userToken)
  })

  it('token 为空的明确 sign_in 才判退出，空白、加载和带 token 登录页不会误清凭据', () => {
    expect(read()).toEqual({ status: 'loading', state: null })
    history.replaceState(null, '', '/sign_in')
    expect(read()).toEqual({ status: 'signed-out', state: null })
    localStorage.setItem('userToken', '{"value":null,"__version":"0"}')
    expect(read()).toEqual({ status: 'signed-out', state: null })
    localStorage.setItem('userToken', state.userToken)
    expect(read()).toEqual({ status: 'loading', state: null })
    history.replaceState(null, '', '/a/chat/s/test-chat')
    expect(read()).toEqual({ status: 'loading', state: null })
    showComposer()
    expect(read().status).toBe('authenticated')
  })

  it('有 token 但只有隐藏输入框、消息中的 textarea 或非聊天路由，仍保持 loading', () => {
    localStorage.setItem('userToken', state.userToken)
    for (const html of ['<div hidden><textarea></textarea></div>', '<textarea style="display:none"></textarea>',
      '<div class="ds-message"><textarea></textarea></div>', '<textarea></textarea><textarea></textarea>']) {
      document.body.innerHTML = html
      expect(read()).toEqual({ status: 'loading', state: null })
    }
    showComposer()
    history.replaceState(null, '', '/share/example')
    expect(read()).toEqual({ status: 'loading', state: null })
  })

  it.each(['null', '""', '{"value":null,"__version":"0"}', '{"value":"test","__version":"1"}', 'not-json'])
  ('无效 token %s 不恢复、不返回 authenticated', userToken => {
    showComposer()
    expect(restore({ ...state, userToken })).toEqual({ status: 'invalid-state' })
    localStorage.setItem('userToken', userToken)
    expect(read()).toEqual({ status: 'loading', state: null })
  })

  it('支持官网兼容的旧 JSON string token，保留转义字符且不会执行插值', () => {
    const legacy = { ...state, userToken: JSON.stringify('test-token` ${window.unwanted = true}\n"') }
    expect(restore(legacy)).toEqual({ status: 'restored' })
    showComposer()
    expect(read()).toEqual({ status: 'authenticated', state: legacy })
    expect('unwanted' in window).toBe(false)
  })
})
