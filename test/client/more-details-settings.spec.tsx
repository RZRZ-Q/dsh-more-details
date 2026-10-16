// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useSyncExternalStore } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Context } from '@deepseek-ai/cordis'
import type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MoreDetailsSettings, mountMoreDetailsSettings, type MoreDetailsSettingsProps } from '../../src/client/dsh/MoreDetailsSettings.js'
import { DEFAULT_MORE_DETAILS_PROMPT } from '../../src/shared/more-details.js'
import { deferred } from '../fixtures/client-runtime.js'

type Snapshot = ConfigFormSnapshot<{ readonly defaultPrompt: string }>

function fixture(overrides: Partial<Snapshot> = {}) {
  let snapshot: Snapshot = {
    status: 'ready', value: { defaultPrompt: DEFAULT_MORE_DETAILS_PROMPT },
    base: { defaultPrompt: DEFAULT_MORE_DETAILS_PROMPT }, user: undefined,
    revision: 1, writable: true, mode: 'host', ...overrides,
  }
  const listeners = new Set<() => void>()
  const publish = (patch: Partial<Snapshot>): void => {
    snapshot = { ...snapshot, ...patch }
    for (const listener of listeners) listener()
  }
  const form = {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    set: vi.fn(async (_field: string, value: string) => {
      publish({ value: { defaultPrompt: value }, user: { defaultPrompt: value }, revision: snapshot.revision! + 1 })
      return true
    }),
    unset: vi.fn(async (_field: string) => {
      publish({ value: { defaultPrompt: DEFAULT_MORE_DETAILS_PROMPT }, user: undefined, revision: snapshot.revision! + 1 })
      return true
    }),
  }
  const props = {
    usePromptSettings: <T,>(selector: (value: Snapshot) => T): T => selector(useSyncExternalStore(form.subscribe, form.getSnapshot)),
    savePrompt: (prompt: string) => form.set('defaultPrompt', prompt),
    resetPrompt: () => form.unset('defaultPrompt'),
  } as MoreDetailsSettingsProps
  return { form, props, publish }
}

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('更多详情提示词设置', () => {
  it('显示已保存值，多行编辑仅在点击保存时提交，并可恢复默认', async () => {
    const f = fixture({ value: { defaultPrompt: '已保存的指令' }, user: { defaultPrompt: '已保存的指令' } })
    render(<MoreDetailsSettings {...f.props} />)
    const input = screen.getByRole('textbox', { name: '默认提示词' })
    expect(input).toHaveValue('已保存的指令')
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    const multiline = '先解释含义。\n\n再给一个例子。'
    fireEvent.change(input, { target: { value: multiline } })
    expect(f.form.set).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('提示词已保存'))
    expect(f.form.set).toHaveBeenCalledExactlyOnceWith('defaultPrompt', multiline)
    expect(input).toHaveValue(multiline)
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '恢复默认' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('已恢复默认提示词'))
    expect(f.form.unset).toHaveBeenCalledExactlyOnceWith('defaultPrompt')
    expect(input).toHaveValue(DEFAULT_MORE_DETAILS_PROMPT)
  })

  it.each([
    [{ status: 'loading', value: undefined } as const, '正在读取'],
    [{ status: 'unavailable', mode: 'memory', writable: false } as const, '不支持持久保存'],
    [{ status: 'unavailable' } as const, '未提供“更多详情”配置'],
    [{ writable: false } as const, '配置只读'],
  ])('在配置不可持久写入时禁用控件并说明原因 %j', (state, reason) => {
    const f = fixture(state)
    render(<MoreDetailsSettings {...f.props} />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '恢复默认' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(reason)
    expect(f.form.set).not.toHaveBeenCalled()
  })

  it('配置加载后显示Host值，但后续外部更新不覆盖未保存草稿', () => {
    const f = fixture({ status: 'loading', value: undefined })
    render(<MoreDetailsSettings {...f.props} />)
    act(() => { f.publish({ status: 'ready', value: { defaultPrompt: 'Host 指令' } }) })
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('Host 指令')
    fireEvent.change(input, { target: { value: '我的未保存修改' } })
    act(() => { f.publish({ value: { defaultPrompt: '另一个编辑器的修改' }, revision: 2 }) })
    expect(input).toHaveValue('我的未保存修改')
  })

  it('保存被拒绝时保留草稿，提示失败并允许重试', async () => {
    const f = fixture()
    f.form.set.mockResolvedValueOnce(false)
    render(<MoreDetailsSettings {...f.props} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '保留我的修改' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('未能保存'))
    expect(screen.getByRole('textbox')).toHaveValue('保留我的修改')
    expect(screen.queryByText(/提示词已保存/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('提示词已保存'))
  })

  it('恢复默认失败时保留当前编辑，显示连接错误', async () => {
    const f = fixture()
    f.form.unset.mockRejectedValueOnce(new Error('连接已断开'))
    render(<MoreDetailsSettings {...f.props} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '未保存的草稿' } })
    fireEvent.click(screen.getByRole('button', { name: '恢复默认' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('连接已断开'))
    expect(screen.getByRole('textbox')).toHaveValue('未保存的草稿')
  })

  it('保存期间阻止重复提交，拒绝纯空白指令', async () => {
    const f = fixture()
    const pending = deferred<boolean>()
    f.form.set.mockImplementationOnce(() => pending.promise)
    render(<MoreDetailsSettings {...f.props} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' \n ' } })
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
    expect(screen.getByText('请输入非空的提示词。')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '新的指令' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByRole('button', { name: '正在保存…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '恢复默认' })).toBeDisabled()
    expect(screen.getByRole('textbox')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '正在保存…' }))
    expect(f.form.set).toHaveBeenCalledOnce()
    await act(async () => { pending.resolve(false); await pending.promise })
  })

  it('挂载正式设置Slot并在卸载时移除', () => {
    const f = fixture()
    const remove = vi.fn()
    const register = vi.fn(() => remove)
    const get = vi.fn(() => f.form)
    const inject = vi.fn((_name: string, mount: () => () => void) => mount())
    const dispose = mountMoreDetailsSettings({ configForms: { get }, slots: { inject, register } } as unknown as Context)
    expect(get).toHaveBeenCalledExactlyOnceWith('more-details')
    expect(register).toHaveBeenCalledWith(expect.objectContaining({
      name: 'settings.general.item', id: 'more-details-prompt',
    }), MoreDetailsSettings)
    dispose()
    expect(remove).toHaveBeenCalledOnce()
  })
})
