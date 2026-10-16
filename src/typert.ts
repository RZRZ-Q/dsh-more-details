import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol'
import { z } from 'zod'
import {
  cancelResultSchema, chatRequestSchema, closeResultSchema, createRequestSchema, createResultSchema,
  selectModelRequestSchema, selectModelResultSchema, sendRequestSchema, streamEventSchema,
  prepareDetailsRequestSchema, prepareDetailsResultSchema, moreDetailsWireErrorSchema,
} from './shared/side-chat-wire.js'
import { isWebChatLoginState, type WebChatLoginState } from './shared/webchat-login.js'
import { isWebChatCapture, isWebChatReference, type WebChatCapture, type WebChatReference } from './shared/webchat-reference.js'

const webChatCaptureSchema = z.custom<WebChatCapture>(isWebChatCapture, '网页讨论快照格式无效。')
const webChatReferenceSchema = z.custom<WebChatReference>(isWebChatReference, '网页讨论引用格式无效。')
const saveWebChatReferenceRequestSchema = z.object({ sessionId: z.string().min(1), capture: webChatCaptureSchema }).strict()
const readWebChatReferenceRequestSchema = z.object({ sessionId: z.string().min(1), referenceId: z.string().regex(/^sha256:[a-f0-9]{64}$/u) }).strict()
const saveWebChatReferenceResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), value: z.object({ reference: webChatReferenceSchema }).strict() }).strict(),
  z.object({ ok: z.literal(false), error: moreDetailsWireErrorSchema }).strict(),
])
const readWebChatReferenceResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), value: z.object({ reference: webChatReferenceSchema, capture: webChatCaptureSchema }).strict() }).strict(),
  z.object({ ok: z.literal(false), error: moreDetailsWireErrorSchema }).strict(),
])

// Typert 会把解析错误送回调用方；固定错误文字，避免回显凭据或未知字段。
function privateLoginCodec<T>(schema: z.ZodType<T>) {
  return z.custom<T>(value => schema.safeParse(value).success, '网页登录数据格式无效。')
}
function loginResult<Value extends z.ZodType>(value: Value) {
  return privateLoginCodec(z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), value }).strict(),
    z.object({ ok: z.literal(false), error: moreDetailsWireErrorSchema }).strict(),
  ]))
}
const loginStateSchema = z.custom<WebChatLoginState>(isWebChatLoginState, '网页登录数据格式无效。')
const webChatLoginRequestSchema = privateLoginCodec(z.object({}).strict())
const saveWebChatLoginRequestSchema = privateLoginCodec(z.object({ state: loginStateSchema }).strict())
const readWebChatLoginResultSchema = loginResult(z.object({ state: loginStateSchema.nullable() }).strict())
const saveWebChatLoginResultSchema = loginResult(z.object({ saved: z.literal(true) }).strict())
const clearWebChatLoginResultSchema = loginResult(z.object({ cleared: z.literal(true) }).strict())

type Schema = { parse(value: unknown): unknown }
function invocation(method: string, requestType: string, resultType: string,
  request: Schema, result: Schema, options: { stream?: boolean; cancellation?: boolean } = {}): InvocationDescriptor {
  return {
    id: `dsh-more-details#moreDetails/${method}`, service: 'moreDetails', namespace: 'moreDetails',
    method, implementation: method, invocation: { kind: 'direct' },
    ...(options.stream ? { mode: 'stream' as const } : {}),
    ...(options.cancellation ? { cancellation: { parameter: 'signal' as const } } : {}),
    parameters: [{ name: 'request', wire: 'request', source: 'json', codec: {
      mode: 'strict', typeSymbol: `dsh-more-details/remote#${requestType}`, create: () => request,
    } }],
    result: { mode: 'strict', typeSymbol: `dsh-more-details/remote#${resultType}`, create: () => result },
    sourceLocation: { file: 'src/index.ts', line: 1, column: 1 },
  }
}
export const SIDE_CHAT_INVOCATIONS = [
  invocation('saveWebChatReference', 'SaveWebChatReferenceRequest', 'SaveWebChatReferenceResult', saveWebChatReferenceRequestSchema, saveWebChatReferenceResultSchema, { cancellation: true }),
  invocation('readWebChatReference', 'ReadWebChatReferenceRequest', 'ReadWebChatReferenceResult', readWebChatReferenceRequestSchema, readWebChatReferenceResultSchema, { cancellation: true }),
  invocation('readWebChatLogin', 'WebChatLoginRequest', 'ReadWebChatLoginResult', webChatLoginRequestSchema, readWebChatLoginResultSchema),
  invocation('saveWebChatLogin', 'SaveWebChatLoginRequest', 'SaveWebChatLoginResult', saveWebChatLoginRequestSchema, saveWebChatLoginResultSchema),
  invocation('clearWebChatLogin', 'WebChatLoginRequest', 'ClearWebChatLoginResult', webChatLoginRequestSchema, clearWebChatLoginResultSchema),
  invocation('prepareDetails', 'PrepareDetailsRequest', 'PrepareDetailsResult', prepareDetailsRequestSchema, prepareDetailsResultSchema, { cancellation: true }),
  invocation('create', 'CreateSideChatRequest', 'CreateResult', createRequestSchema, createResultSchema, { cancellation: true }),
  invocation('selectModel', 'SelectSideChatModelRequest', 'SelectModelResult', selectModelRequestSchema, selectModelResultSchema, { cancellation: true }),
  invocation('stream', 'SendSideChatRequest', 'SideChatStreamEvent', sendRequestSchema, streamEventSchema, { stream: true, cancellation: true }),
  invocation('cancel', 'ChatRequest', 'CancelResult', chatRequestSchema, cancelResultSchema),
  invocation('close', 'ChatRequest', 'CloseResult', chatRequestSchema, closeResultSchema),
]
export const TYPERT = {
  package: 'dsh-more-details', face: 'host', schemas: [],
  model: { services: [], events: [], objects: [] }, invocations: SIDE_CHAT_INVOCATIONS,
}
export default TYPERT
