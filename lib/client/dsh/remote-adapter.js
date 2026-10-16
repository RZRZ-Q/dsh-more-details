import TYPERT_REMOTE from '../../remote.js';
function remoteFailure(error) {
    const code = error.code;
    const badRequest = code === 'bad-request' || code === 'gateway/bad-request';
    return { code: badRequest ? 'invalid_request' : 'transport_error',
        message: error.message || 'The Side Chat RPC failed.', recoverable: !badRequest };
}
async function unwrap(result) {
    const value = await result;
    return value.ok ? value.value : { ok: false, error: remoteFailure(value.error) };
}
async function loginValue(result, message) {
    try {
        const value = await result;
        if (value.ok && value.value.ok)
            return value.value.value;
    }
    catch { /* 不把 RPC 错误中的潜在登录数据带进界面。 */ }
    throw new Error(message);
}
export async function mountSideChatRemote(ctx) {
    const dispose = await ctx.remote.$mount(TYPERT_REMOTE);
    const rpc = ctx.get('remote.moreDetails');
    return { prepareDetails: request => unwrap(rpc.prepareDetails(request)),
        saveWebChatReference: request => unwrap(rpc.saveWebChatReference(request)), loginStore: {
            read: async () => (await loginValue(rpc.readWebChatLogin({}), '无法读取已保存的网页登录状态。')).state,
            save: async (state) => { await loginValue(rpc.saveWebChatLogin({ state }), '无法保存网页登录状态。'); },
            clear: async () => { await loginValue(rpc.clearWebChatLogin({}), '无法清除已保存的网页登录状态。'); },
        }, remote: {
            create: request => unwrap(rpc.create(request)),
            selectModel: request => unwrap(rpc.selectModel(request)),
            stream: request => rpc.stream(request),
            cancel: request => unwrap(rpc.cancel(request)),
            close: request => unwrap(rpc.close(request)),
        }, dispose };
}
