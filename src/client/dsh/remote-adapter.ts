import type { RemoteFailure, RemoteResult, TypertRemoteNamespace } from '@deepseek-ai/dsh-typert-protocol'
import TYPERT_REMOTE from '../../remote.js'
import type { SideChatRemote, SideChatResult, SideChatWireError } from '../../shared/contracts.js'
import type { PrepareDetails } from './more-details-controller.js'
import type { DshClientContext } from './context.js'
import type { WebChatLoginStore } from '../../shared/webchat-login.js'
import type { SaveWebChatReference } from '../webchat/controller.js'

function remoteFailure(error: RemoteFailure): SideChatWireError {
  const code: string = error.code
  const badRequest = code === 'bad-request' || code === 'gateway/bad-request'
  return { code: badRequest ? 'invalid_request' : 'transport_error',
    message: error.message || 'The Side Chat RPC failed.', recoverable: !badRequest }
}
async function unwrap<T>(result: Promise<RemoteResult<SideChatResult<T>>>): Promise<SideChatResult<T>> {
  const value = await result
  return value.ok ? value.value : { ok: false, error: remoteFailure(value.error) }
}
async function loginValue<T>(result: Promise<RemoteResult<SideChatResult<T>>>, message: string): Promise<T> {
  try {
    const value = await result
    if (value.ok && value.value.ok) return value.value.value
  } catch { /* 不把 RPC 错误中的潜在登录数据带进界面。 */ }
  throw new Error(message)
}
export async function mountSideChatRemote(ctx: DshClientContext): Promise<{
  readonly prepareDetails: PrepareDetails
  readonly remote: SideChatRemote
  readonly loginStore: WebChatLoginStore
  readonly saveWebChatReference: SaveWebChatReference
  readonly dispose: () => Promise<void>
}> {
  const dispose = await ctx.remote.$mount(TYPERT_REMOTE)
  const rpc = ctx.get('remote.moreDetails') as unknown as TypertRemoteNamespace<'moreDetails'>
  return { prepareDetails: request => unwrap(rpc.prepareDetails(request)),
    saveWebChatReference: request => unwrap(rpc.saveWebChatReference(request)), loginStore: {
    read: async () => (await loginValue(rpc.readWebChatLogin({}), '无法读取已保存的网页登录状态。')).state,
    save: async state => { await loginValue(rpc.saveWebChatLogin({ state }), '无法保存网页登录状态。') },
    clear: async () => { await loginValue(rpc.clearWebChatLogin({}), '无法清除已保存的网页登录状态。') },
  }, remote: {
    create: request => unwrap(rpc.create(request)),
    selectModel: request => unwrap(rpc.selectModel(request)),
    stream: request => rpc.stream(request),
    cancel: request => unwrap(rpc.cancel(request)),
    close: request => unwrap(rpc.close(request)),
  }, dispose }
}
