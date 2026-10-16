import * as z from 'zod/mini'
import { SIDE_CHAT_ERROR_CODES } from './error-codes.js'
import { MAX_SELECTION_BYTES } from './constants.js'

const id = z.string().check(z.minLength(1), z.maxLength(512))
export const modelSelectionSchema = z.strictObject({ provider: id, model: id, reasoningEffort: z.optional(id) })
export const moreDetailsWireErrorSchema = z.strictObject({
  code: z.enum(SIDE_CHAT_ERROR_CODES), message: z.string(), recoverable: z.boolean(),
})
export const createRequestSchema = z.strictObject({
  parentSessionId: id, atSeq: z.int().check(z.nonnegative()),
  selectedText: z.optional(z.string().check(z.maxLength(16 * 1024))), modelSelection: z.optional(modelSelectionSchema),
})
export const prepareDetailsRequestSchema = z.strictObject({
  parentSessionId: id, atSeq: z.int().check(z.nonnegative()),
  selectedText: z.string().check(
    z.refine(value => /\S/u.test(value), 'Select some conversation text first.'),
    z.refine(value => new TextEncoder().encode(value).length <= MAX_SELECTION_BYTES, 'The selected text is too large.'),
  ),
})
export const chatRequestSchema = z.strictObject({ chatId: id })
export const selectModelRequestSchema = z.strictObject({
  chatId: id, provider: id, model: id, reasoningEffort: z.optional(id),
})
export const sendRequestSchema = z.strictObject({ chatId: id, requestId: id, text: z.string().check(z.minLength(1), z.maxLength(64 * 1024)) })
function resultSchema<Value extends z.ZodMiniType>(value: Value) {
  return z.discriminatedUnion('ok', [
    z.strictObject({ ok: z.literal(true), value }),
    z.strictObject({ ok: z.literal(false), error: moreDetailsWireErrorSchema }),
  ])
}
export const createResultSchema = resultSchema(z.strictObject({
  parentSessionId: id, chatId: id, boundarySeq: z.int().check(z.nonnegative()), modelSelection: modelSelectionSchema,
}))
export const prepareDetailsResultSchema = resultSchema(z.strictObject({ prompt: z.string().check(z.minLength(1)) }))
export const selectModelResultSchema = resultSchema(z.strictObject({ selected: modelSelectionSchema }))
export const closeResultSchema = resultSchema(z.strictObject({ closed: z.literal(true) }))
export const cancelResultSchema = resultSchema(z.strictObject({ cancelled: z.literal(true) }))
export const streamEventSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('started'), requestId: id, modelSelection: modelSelectionSchema }),
  z.strictObject({ type: z.literal('content'), text: z.string(), reasoning: z.string() }),
  z.strictObject({ type: z.literal('finished'), status: z.enum(['complete', 'stopped']) }),
  z.strictObject({ type: z.literal('error'), error: moreDetailsWireErrorSchema }),
])
