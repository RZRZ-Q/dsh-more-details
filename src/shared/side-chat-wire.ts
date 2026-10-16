import { z } from 'zod'
import { SIDE_CHAT_ERROR_CODES } from './error-codes.js'
import { MAX_SELECTION_BYTES } from './constants.js'

const id = z.string().min(1).max(512)
export const modelSelectionSchema = z.object({ provider: id, model: id, reasoningEffort: id.optional() }).strict()
export const moreDetailsWireErrorSchema = z.object({
  code: z.enum(SIDE_CHAT_ERROR_CODES), message: z.string(), recoverable: z.boolean(),
}).strict()
export const createRequestSchema = z.object({
  parentSessionId: id, atSeq: z.number().int().nonnegative(),
  selectedText: z.string().max(16 * 1024).optional(), modelSelection: modelSelectionSchema.optional(),
}).strict()
export const prepareDetailsRequestSchema = z.object({
  parentSessionId: id, atSeq: z.number().int().nonnegative(),
  selectedText: z.string().refine(value => /\S/u.test(value), 'Select some conversation text first.')
    .refine(value => new TextEncoder().encode(value).length <= MAX_SELECTION_BYTES, 'The selected text is too large.'),
}).strict()
export const chatRequestSchema = z.object({ chatId: id }).strict()
export const selectModelRequestSchema = z.object({
  chatId: id, provider: id, model: id, reasoningEffort: id.optional(),
}).strict()
export const sendRequestSchema = z.object({ chatId: id, requestId: id, text: z.string().min(1).max(64 * 1024) }).strict()
function resultSchema<Value extends z.ZodType>(value: Value) {
  return z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), value }).strict(),
    z.object({ ok: z.literal(false), error: moreDetailsWireErrorSchema }).strict(),
  ])
}
export const createResultSchema = resultSchema(z.object({
  parentSessionId: id, chatId: id, boundarySeq: z.number().int().nonnegative(), modelSelection: modelSelectionSchema,
}).strict())
export const prepareDetailsResultSchema = resultSchema(z.object({ prompt: z.string().min(1) }).strict())
export const selectModelResultSchema = resultSchema(z.object({ selected: modelSelectionSchema }).strict())
export const closeResultSchema = resultSchema(z.object({ closed: z.literal(true) }).strict())
export const cancelResultSchema = resultSchema(z.object({ cancelled: z.literal(true) }).strict())
export const streamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('started'), requestId: id, modelSelection: modelSelectionSchema }).strict(),
  z.object({ type: z.literal('content'), text: z.string(), reasoning: z.string() }).strict(),
  z.object({ type: z.literal('finished'), status: z.enum(['complete', 'stopped']) }).strict(),
  z.object({ type: z.literal('error'), error: moreDetailsWireErrorSchema }).strict(),
])
