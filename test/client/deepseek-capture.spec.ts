// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chat.deepseek.com"}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deepSeekCaptureScript, type DeepSeekCaptureResult } from '../../src/client/webchat/deepseek-capture.js'

const URL = 'https://chat.deepseek.com/a/chat/s/chat-1'
function user(text: string, id = 'u1'): string {
  return `<div class="_9663006" data-virtual-list-item-key="${id}"><div class="ds-message"><div class="ds-collapsible-text"><div><span>${text}</span></div></div></div></div>`
}
function assistant(body: string, id = 'a1', ended = true): string {
  return `<div class="_4f9bf79" data-virtual-list-item-key="${id}"><div class="ds-message"><div class="ds-think-content">不可带入的思考</div><div class="ds-assistant-message-main-content">${body}</div></div>${ended ? '<div class="_0a3d93b"><div class="_965abe9"><button>复制</button></div></div>' : ''}</div>`
}
function setup(body: string): void {
  document.body.innerHTML = `<script src="https://fe-static.deepseek.com/chat/main.6fca03582d.js"></script><main>${body}</main><textarea></textarea>`
}
const capture = (): Promise<DeepSeekCaptureResult> => window.eval(deepSeekCaptureScript(URL)) as Promise<DeepSeekCaptureResult>

beforeEach(() => {
  history.replaceState(null, '', '/a/chat/s/chat-1')
  document.title = '网页讨论 - DeepSeek'
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: -1000, left: 0, top: -1000, right: 100,
    bottom: -970, width: 100, height: 30, toJSON: () => ({}) })
})
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('网页讨论正文快照', () => {
  it('采集已渲染的多轮正文与角色，保留离开视口的节点，明确标为 partial', async () => {
    setup(user('第一问') + assistant('<p>第一答</p>') + user('第二问', 'u2') + assistant('<p>第二答</p>', 'a2'))
    history.replaceState(null, '', '/a/chat/s/chat-1?temporary=private#position')
    const result = await capture()
    expect(result).toMatchObject({ ok: true, capture: { version: 1, url: URL, title: '网页讨论 - DeepSeek',
      scope: 'rendered-current-branch', completeness: 'partial', messages: [
        { id: 'u1', role: 'user', content: '第一问' }, { id: 'a1', role: 'assistant', content: '第一答' },
        { id: 'u2', role: 'user', content: '第二问' }, { id: 'a2', role: 'assistant', content: '第二答' },
      ] } })
    if (!result.ok) throw new Error(result.reason)
    expect(Number.isFinite(Date.parse(result.capture.capturedAt))).toBe(true)
    expect(JSON.stringify(result)).not.toContain('不可带入的思考')
    expect(JSON.stringify(result)).not.toContain('复制')
  })

  it('保留围栏语言、代码内空行和反引号、行内代码、KaTeX 公式及链接', async () => {
    const code = 'const text = "```";\n\nreturn text;'
    setup(user('解释代码公式') + assistant('<div class="md-code-block"><div class="md-code-block-infostring">typescript</div><button>复制代码</button><pre><code>'
      + code + '</code></pre></div><p>查看 <code>x`y</code> 和 <a href="https://example.com/docs?q=1">文档</a>。</p>'
      + '<p><span class="katex"><span aria-hidden="true">渲染副本</span><math><annotation encoding="application/x-tex">x^2</annotation></math></span></p>'
      + '<span class="katex-display"><span class="katex"><math><annotation encoding="application/x-tex">\\frac{1}{2}</annotation></math></span></span>'))
    const result = await capture()
    if (!result.ok) throw new Error(result.reason)
    const content = result.capture.messages[1]!.content
    expect(content).toContain('````typescript\n' + code + '\n````')
    expect(content).toContain('`` x`y ``')
    expect(content).toContain('[文档](<https://example.com/docs?q=1>)')
    expect(content).toContain('$x^2$')
    expect(content).toContain('$$\n\\frac{1}{2}\n$$')
    expect(content).not.toMatch(/复制代码|渲染副本/)
  })

  it('保留列表、表格和引用结构，并对未采集图片给出正文占位说明', async () => {
    setup(user('结构') + assistant('<h2>结果</h2><ol start="3"><li>第一项<ul><li>子项</li></ul></li><li>第二项</li></ol>'
      + '<table><thead><tr><th>指标</th><th>值</th></tr></thead><tbody><tr><td>A|B</td><td>3.24</td></tr></tbody></table>'
      + '<blockquote><p>这里引用</p></blockquote><img alt="曲线图" src="https://example.com/plot.png">'))
    const result = await capture()
    if (!result.ok) throw new Error(result.reason)
    const content = result.capture.messages[1]!.content
    expect(content).toContain('## 结果')
    expect(content).toContain('3. 第一项')
    expect(content).toContain('   - 子项')
    expect(content).toContain('4. 第二项')
    expect(content).toContain('| 指标 | 值 |\n| --- | --- |\n| A\\|B | 3.24 |')
    expect(content).toContain('> 这里引用')
    expect(content).toContain('[图片未采集：曲线图]')
  })

  it('即使有发送按钮和草稿，也不把缺少结束操作栏的生成中回答当作完成', async () => {
    setup(user('问题') + assistant('<p>正在输出</p>', 'a1', false))
    document.body.insertAdjacentHTML('beforeend', '<button aria-label="发送"></button>')
    document.querySelector('textarea')!.value = '原草稿'
    expect(await capture()).toMatchObject({ ok: false, reason: expect.stringContaining('尚未确认网页回答已结束，请等回答结束后再添加。') })
    expect(document.querySelector('textarea')!.value).toBe('原草稿')
  })

  it.each(['main.6fca03582d.js', 'main.a6bd2c6c8d.js', 'main.3a179229d7.js'])('%s：正在加载时拒绝采集，已结束且 probe 状态未知仍可读取', async basename => {
    setup(user('问题') + assistant('<p>答案</p>'))
    document.querySelector('script')!.src = `https://fe-static.deepseek.com/chat/static/${basename}`
    expect(await capture()).toMatchObject({ ok: true })
    document.body.insertAdjacentHTML('beforeend', '<div class="_52c986b"><span data-icon="spin"></span></div>')
    expect(await capture()).toEqual({ ok: false, reason: '网页仍在生成回答，请等回答结束后再添加。' })
    document.querySelector('._52c986b')!.remove()
    document.querySelector('._965abe9')!.remove()
    expect(await capture()).toMatchObject({ ok: false, reason: expect.stringContaining('尚未确认网页回答已结束') })
  })

  it('入口文件更新不影响已核验 DOM 契约，未知角色和无法恢复 TeX 的公式明确拒绝', async () => {
    setup(user('问题') + assistant('<p>答案</p>'))
    document.querySelector('script')!.src = 'https://fe-static.deepseek.com/chat/main.new-build.js?private=hidden#fragment'
    expect(await capture()).toMatchObject({ ok: true })
    document.querySelector('._9663006')!.className = 'unknown-user-wrapper'
    const unknownRole = await capture()
    expect(unknownRole).toMatchObject({ ok: false, reason: expect.stringContaining('公开脚本：script https://fe-static.deepseek.com/main.new-build.js') })
    expect(JSON.stringify(unknownRole)).not.toMatch(/private|hidden|fragment/)
    setup('<div class="ds-message">未知角色</div>')
    expect(await capture()).toMatchObject({ ok: false, reason: expect.stringContaining('无法辨认') })
    setup(user('公式') + assistant('<span class="katex">只有渲染字形</span>'))
    expect(await capture()).toMatchObject({ ok: false, reason: expect.stringContaining('不能可靠采集') })
  })

  it('缺少入口脚本仍按 DOM 契约采集，结构诊断包含 modulepreload 的公开文件名', async () => {
    setup(user('问题') + assistant('<p>答案</p>'))
    document.querySelector('script')!.remove()
    document.body.insertAdjacentHTML('afterbegin', '<link rel="modulepreload" href="https://fe-static.deepseek.com/chat/main.6fca03582d.js?private=hidden#fragment">')
    expect(await capture()).toMatchObject({ ok: true })
    document.querySelector('._965abe9')!.remove()
    const result = await capture()
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('modulepreload https://fe-static.deepseek.com/main.6fca03582d.js') })
    expect(JSON.stringify(result)).not.toMatch(/private|hidden|fragment/)
  })

  it('不读取凭据、不导航、不滚动、不请求网络，且只接受原目标官网聊天', async () => {
    setup(user('问题') + assistant('<p>答案</p>'))
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const storage = vi.spyOn(Storage.prototype, 'getItem')
    const cookie = vi.spyOn(document, 'cookie', 'get')
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const html = document.body.innerHTML
    expect(await capture()).toMatchObject({ ok: true })
    expect(document.body.innerHTML).toBe(html)
    expect([fetch, storage, cookie, scroll].every(spy => spy.mock.calls.length === 0)).toBe(true)
    history.replaceState(null, '', '/a/chat/s/other')
    expect(await capture()).toMatchObject({ ok: false, reason: expect.stringContaining('网页已切换') })
    vi.stubGlobal('location', { origin: 'https://example.com', pathname: '/a/chat/s/chat-1' })
    expect(await capture()).toMatchObject({ ok: false, reason: expect.stringContaining('不是 DeepSeek 官网') })
  })
})
