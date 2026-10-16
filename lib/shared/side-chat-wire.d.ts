import * as z from 'zod/mini';
export declare const modelSelectionSchema: z.ZodMiniObject<{
    provider: z.ZodMiniString<string>;
    model: z.ZodMiniString<string>;
    reasoningEffort: z.ZodMiniOptional<z.ZodMiniString<string>>;
}, z.core.$strict>;
export declare const moreDetailsWireErrorSchema: z.ZodMiniObject<{
    code: z.ZodMiniEnum<{
        selection_empty: "selection_empty";
        selection_outside_conversation: "selection_outside_conversation";
        selection_not_model_visible: "selection_not_model_visible";
        selection_too_large: "selection_too_large";
        selection_stale: "selection_stale";
        selection_crosses_unsupported_nodes: "selection_crosses_unsupported_nodes";
        parent_session_missing: "parent_session_missing";
        parent_session_not_ready: "parent_session_not_ready";
        context_unavailable: "context_unavailable";
        context_too_large: "context_too_large";
        side_chat_already_open: "side_chat_already_open";
        side_chat_not_found: "side_chat_not_found";
        side_chat_prompt_failed: "side_chat_prompt_failed";
        side_chat_model_failed: "side_chat_model_failed";
        side_chat_interrupt_failed: "side_chat_interrupt_failed";
        side_chat_destroy_failed: "side_chat_destroy_failed";
        transport_error: "transport_error";
        invalid_request: "invalid_request";
        internal_error: "internal_error";
    }>;
    message: z.ZodMiniString<string>;
    recoverable: z.ZodMiniBoolean<boolean>;
}, z.core.$strict>;
export declare const createRequestSchema: z.ZodMiniObject<{
    parentSessionId: z.ZodMiniString<string>;
    atSeq: z.ZodMiniNumberFormat;
    selectedText: z.ZodMiniOptional<z.ZodMiniString<string>>;
    modelSelection: z.ZodMiniOptional<z.ZodMiniObject<{
        provider: z.ZodMiniString<string>;
        model: z.ZodMiniString<string>;
        reasoningEffort: z.ZodMiniOptional<z.ZodMiniString<string>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const prepareDetailsRequestSchema: z.ZodMiniObject<{
    parentSessionId: z.ZodMiniString<string>;
    atSeq: z.ZodMiniNumberFormat;
    selectedText: z.ZodMiniString<string>;
}, z.core.$strict>;
export declare const chatRequestSchema: z.ZodMiniObject<{
    chatId: z.ZodMiniString<string>;
}, z.core.$strict>;
export declare const selectModelRequestSchema: z.ZodMiniObject<{
    chatId: z.ZodMiniString<string>;
    provider: z.ZodMiniString<string>;
    model: z.ZodMiniString<string>;
    reasoningEffort: z.ZodMiniOptional<z.ZodMiniString<string>>;
}, z.core.$strict>;
export declare const sendRequestSchema: z.ZodMiniObject<{
    chatId: z.ZodMiniString<string>;
    requestId: z.ZodMiniString<string>;
    text: z.ZodMiniString<string>;
}, z.core.$strict>;
export declare const createResultSchema: z.ZodMiniDiscriminatedUnion<[z.ZodMiniObject<{
    ok: z.ZodMiniLiteral<true>;
    value: z.ZodMiniObject<{
        parentSessionId: z.ZodMiniString<string>;
        chatId: z.ZodMiniString<string>;
        boundarySeq: z.ZodMiniNumberFormat;
        modelSelection: z.ZodMiniObject<{
            provider: z.ZodMiniString<string>;
            model: z.ZodMiniString<string>;
            reasoningEffort: z.ZodMiniOptional<z.ZodMiniString<string>>;
        }, z.core.$strict>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodMiniObject<{
    ok: z.ZodMiniLiteral<false>;
    error: z.ZodMiniObject<{
        code: z.ZodMiniEnum<{
            selection_empty: "selection_empty";
            selection_outside_conversation: "selection_outside_conversation";
            selection_not_model_visible: "selection_not_model_visible";
            selection_too_large: "selection_too_large";
            selection_stale: "selection_stale";
            selection_crosses_unsupported_nodes: "selection_crosses_unsupported_nodes";
            parent_session_missing: "parent_session_missing";
            parent_session_not_ready: "parent_session_not_ready";
            context_unavailable: "context_unavailable";
            context_too_large: "context_too_large";
            side_chat_already_open: "side_chat_already_open";
            side_chat_not_found: "side_chat_not_found";
            side_chat_prompt_failed: "side_chat_prompt_failed";
            side_chat_model_failed: "side_chat_model_failed";
            side_chat_interrupt_failed: "side_chat_interrupt_failed";
            side_chat_destroy_failed: "side_chat_destroy_failed";
            transport_error: "transport_error";
            invalid_request: "invalid_request";
            internal_error: "internal_error";
        }>;
        message: z.ZodMiniString<string>;
        recoverable: z.ZodMiniBoolean<boolean>;
    }, z.core.$strict>;
}, z.core.$strict>], "ok">;
export declare const prepareDetailsResultSchema: z.ZodMiniDiscriminatedUnion<[z.ZodMiniObject<{
    ok: z.ZodMiniLiteral<true>;
    value: z.ZodMiniObject<{
        prompt: z.ZodMiniString<string>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodMiniObject<{
    ok: z.ZodMiniLiteral<false>;
    error: z.ZodMiniObject<{
        code: z.ZodMiniEnum<{
            selection_empty: "selection_empty";
            selection_outside_conversation: "selection_outside_conversation";
            selection_not_model_visible: "selection_not_model_visible";
            selection_too_large: "selection_too_large";
            selection_stale: "selection_stale";
            selection_crosses_unsupported_nodes: "selection_crosses_unsupported_nodes";
            parent_session_missing: "parent_session_missing";
            parent_session_not_ready: "parent_session_not_ready";
            context_unavailable: "context_unavailable";
            context_too_large: "context_too_large";
            side_chat_already_open: "side_chat_already_open";
            side_chat_not_found: "side_chat_not_found";
            side_chat_prompt_failed: "side_chat_prompt_failed";
            side_chat_model_failed: "side_chat_model_failed";
            side_chat_interrupt_failed: "side_chat_interrupt_failed";
            side_chat_destroy_failed: "side_chat_destroy_failed";
            transport_error: "transport_error";
            invalid_request: "invalid_request";
            internal_error: "internal_error";
        }>;
        message: z.ZodMiniString<string>;
        recoverable: z.ZodMiniBoolean<boolean>;
    }, z.core.$strict>;
}, z.core.$strict>], "ok">;
export declare const selectModelResultSchema: z.ZodMiniDiscriminatedUnion<[z.ZodMiniObject<{
    ok: z.ZodMiniLiteral<true>;
    value: z.ZodMiniObject<{
        selected: z.ZodMiniObject<{
            provider: z.ZodMiniString<string>;
            model: z.ZodMiniString<string>;
            reasoningEffort: z.ZodMiniOptional<z.ZodMiniString<string>>;
        }, z.core.$strict>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodMiniObject<{
    ok: z.ZodMiniLiteral<false>;
    error: z.ZodMiniObject<{
        code: z.ZodMiniEnum<{
            selection_empty: "selection_empty";
            selection_outside_conversation: "selection_outside_conversation";
            selection_not_model_visible: "selection_not_model_visible";
            selection_too_large: "selection_too_large";
            selection_stale: "selection_stale";
            selection_crosses_unsupported_nodes: "selection_crosses_unsupported_nodes";
            parent_session_missing: "parent_session_missing";
            parent_session_not_ready: "parent_session_not_ready";
            context_unavailable: "context_unavailable";
            context_too_large: "context_too_large";
            side_chat_already_open: "side_chat_already_open";
            side_chat_not_found: "side_chat_not_found";
            side_chat_prompt_failed: "side_chat_prompt_failed";
            side_chat_model_failed: "side_chat_model_failed";
            side_chat_interrupt_failed: "side_chat_interrupt_failed";
            side_chat_destroy_failed: "side_chat_destroy_failed";
            transport_error: "transport_error";
            invalid_request: "invalid_request";
            internal_error: "internal_error";
        }>;
        message: z.ZodMiniString<string>;
        recoverable: z.ZodMiniBoolean<boolean>;
    }, z.core.$strict>;
}, z.core.$strict>], "ok">;
export declare const closeResultSchema: z.ZodMiniDiscriminatedUnion<[z.ZodMiniObject<{
    ok: z.ZodMiniLiteral<true>;
    value: z.ZodMiniObject<{
        closed: z.ZodMiniLiteral<true>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodMiniObject<{
    ok: z.ZodMiniLiteral<false>;
    error: z.ZodMiniObject<{
        code: z.ZodMiniEnum<{
            selection_empty: "selection_empty";
            selection_outside_conversation: "selection_outside_conversation";
            selection_not_model_visible: "selection_not_model_visible";
            selection_too_large: "selection_too_large";
            selection_stale: "selection_stale";
            selection_crosses_unsupported_nodes: "selection_crosses_unsupported_nodes";
            parent_session_missing: "parent_session_missing";
            parent_session_not_ready: "parent_session_not_ready";
            context_unavailable: "context_unavailable";
            context_too_large: "context_too_large";
            side_chat_already_open: "side_chat_already_open";
            side_chat_not_found: "side_chat_not_found";
            side_chat_prompt_failed: "side_chat_prompt_failed";
            side_chat_model_failed: "side_chat_model_failed";
            side_chat_interrupt_failed: "side_chat_interrupt_failed";
            side_chat_destroy_failed: "side_chat_destroy_failed";
            transport_error: "transport_error";
            invalid_request: "invalid_request";
            internal_error: "internal_error";
        }>;
        message: z.ZodMiniString<string>;
        recoverable: z.ZodMiniBoolean<boolean>;
    }, z.core.$strict>;
}, z.core.$strict>], "ok">;
export declare const cancelResultSchema: z.ZodMiniDiscriminatedUnion<[z.ZodMiniObject<{
    ok: z.ZodMiniLiteral<true>;
    value: z.ZodMiniObject<{
        cancelled: z.ZodMiniLiteral<true>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodMiniObject<{
    ok: z.ZodMiniLiteral<false>;
    error: z.ZodMiniObject<{
        code: z.ZodMiniEnum<{
            selection_empty: "selection_empty";
            selection_outside_conversation: "selection_outside_conversation";
            selection_not_model_visible: "selection_not_model_visible";
            selection_too_large: "selection_too_large";
            selection_stale: "selection_stale";
            selection_crosses_unsupported_nodes: "selection_crosses_unsupported_nodes";
            parent_session_missing: "parent_session_missing";
            parent_session_not_ready: "parent_session_not_ready";
            context_unavailable: "context_unavailable";
            context_too_large: "context_too_large";
            side_chat_already_open: "side_chat_already_open";
            side_chat_not_found: "side_chat_not_found";
            side_chat_prompt_failed: "side_chat_prompt_failed";
            side_chat_model_failed: "side_chat_model_failed";
            side_chat_interrupt_failed: "side_chat_interrupt_failed";
            side_chat_destroy_failed: "side_chat_destroy_failed";
            transport_error: "transport_error";
            invalid_request: "invalid_request";
            internal_error: "internal_error";
        }>;
        message: z.ZodMiniString<string>;
        recoverable: z.ZodMiniBoolean<boolean>;
    }, z.core.$strict>;
}, z.core.$strict>], "ok">;
export declare const streamEventSchema: z.ZodMiniDiscriminatedUnion<[z.ZodMiniObject<{
    type: z.ZodMiniLiteral<"started">;
    requestId: z.ZodMiniString<string>;
    modelSelection: z.ZodMiniObject<{
        provider: z.ZodMiniString<string>;
        model: z.ZodMiniString<string>;
        reasoningEffort: z.ZodMiniOptional<z.ZodMiniString<string>>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodMiniObject<{
    type: z.ZodMiniLiteral<"content">;
    text: z.ZodMiniString<string>;
    reasoning: z.ZodMiniString<string>;
}, z.core.$strict>, z.ZodMiniObject<{
    type: z.ZodMiniLiteral<"finished">;
    status: z.ZodMiniEnum<{
        complete: "complete";
        stopped: "stopped";
    }>;
}, z.core.$strict>, z.ZodMiniObject<{
    type: z.ZodMiniLiteral<"error">;
    error: z.ZodMiniObject<{
        code: z.ZodMiniEnum<{
            selection_empty: "selection_empty";
            selection_outside_conversation: "selection_outside_conversation";
            selection_not_model_visible: "selection_not_model_visible";
            selection_too_large: "selection_too_large";
            selection_stale: "selection_stale";
            selection_crosses_unsupported_nodes: "selection_crosses_unsupported_nodes";
            parent_session_missing: "parent_session_missing";
            parent_session_not_ready: "parent_session_not_ready";
            context_unavailable: "context_unavailable";
            context_too_large: "context_too_large";
            side_chat_already_open: "side_chat_already_open";
            side_chat_not_found: "side_chat_not_found";
            side_chat_prompt_failed: "side_chat_prompt_failed";
            side_chat_model_failed: "side_chat_model_failed";
            side_chat_interrupt_failed: "side_chat_interrupt_failed";
            side_chat_destroy_failed: "side_chat_destroy_failed";
            transport_error: "transport_error";
            invalid_request: "invalid_request";
            internal_error: "internal_error";
        }>;
        message: z.ZodMiniString<string>;
        recoverable: z.ZodMiniBoolean<boolean>;
    }, z.core.$strict>;
}, z.core.$strict>], "type">;
