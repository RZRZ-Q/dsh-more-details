import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createElement, useLayoutEffect, useRef } from 'react';
import { useDshLocale } from '../dsh/locale.js';
import { SessionId } from '../../shared/contracts.js';
import { SIDE_CHAT_MESSAGES } from '../panel/messages.js';
import { SelectionQuote } from '../panel/SelectionQuote.js';
import { annotationMessageText, conversationAnnotations, parseAnnotatedConversationPrompt, } from './add-to-conversation.js';
import { parseReferencedConversationPrompt, } from './referenced-conversation.js';
import { parseWebChatReferencePrompt, WEBCHAT_REFERENCE_START, WEBCHAT_REFERENCE_END, } from '../../shared/webchat-reference.js';
import { WebChatDraftReferences, WebChatReferenceCard } from './webchat-reference.js';
const ANNOTATION_CHIP_WIDTH_PROPERTY = '--dsh-more-details-parent-annotation-width';
/** The interactive annotation capsule occupying the reserved first composer row. */
export function ParentComposerAnnotations({ input, onRemove, locale, }) {
    const { active, text } = useDshLocale(locale);
    const annotations = conversationAnnotations(input);
    const dockRef = useRef(null);
    useLayoutEffect(() => {
        const dock = dockRef.current;
        const seat = dock?.closest('[data-composer-seat]');
        const chip = dock?.querySelector('.dsh-more-details-quote-chip');
        if (dock === null || seat === undefined || chip === undefined || seat === null || chip === null)
            return;
        // The durable host reference stays in Lexical's document flow. Match its
        // occupied width to this visible overlay so the caret starts at the edge
        // users see instead of after the longer internal serialization label.
        const syncPosition = () => {
            const width = chip.getBoundingClientRect().width;
            if (width > 0)
                seat.style.setProperty(ANNOTATION_CHIP_WIDTH_PROPERTY, `${String(width)}px`);
            const reference = seat.querySelector('[data-composer-chip="dsh-more-details-selection"]');
            if (reference === null)
                return;
            const referenceRect = reference.getBoundingClientRect();
            const dockRect = dock.getBoundingClientRect();
            if (Number.isFinite(referenceRect.left) && Number.isFinite(dockRect.left)) {
                dock.style.setProperty('--annotation-left', `${referenceRect.left - dockRect.left}px`);
                dock.style.setProperty('--annotation-top', `${referenceRect.top - dockRect.top}px`);
            }
        };
        let frame;
        const schedule = () => {
            if (frame !== undefined)
                return;
            frame = window.requestAnimationFrame(() => { frame = undefined; syncPosition(); });
        };
        syncPosition();
        const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
        observer?.observe(chip);
        observer?.observe(seat);
        const mutations = new MutationObserver(schedule);
        mutations.observe(seat, { childList: true, characterData: true, subtree: true });
        seat.addEventListener('scroll', schedule, true);
        window.addEventListener('resize', schedule);
        return () => {
            if (frame !== undefined)
                window.cancelAnimationFrame(frame);
            observer?.disconnect();
            mutations.disconnect();
            seat.removeEventListener('scroll', schedule, true);
            window.removeEventListener('resize', schedule);
            seat.style.removeProperty(ANNOTATION_CHIP_WIDTH_PROPERTY);
        };
    }, [input, active]);
    if (annotations.length === 0)
        return null;
    return (_jsx("div", { ref: dockRef, className: "dsh-more-details-parent-annotation-dock", children: _jsx(SelectionQuote, { selections: annotations, messages: SIDE_CHAT_MESSAGES[text('zh-CN', 'en')], onRemove: onRemove }) }));
}
function contentText(content) {
    return content.map((block) => {
        if (typeof block !== 'object' || block === null)
            return '';
        const value = block;
        return value.type === 'text' && typeof value.text === 'string' ? value.text : '';
    }).join('');
}
function replaceTextContent(content, message) {
    let replaced = false;
    const next = content.flatMap((block) => {
        if (typeof block !== 'object' || block === null)
            return [block];
        const value = block;
        if (value.type !== 'text' || typeof value.text !== 'string')
            return [block];
        if (replaced)
            return [];
        replaced = true;
        return [{ ...value, text: message }];
    });
    return replaced ? next : [{ type: 'text', text: message }, ...next];
}
function parsePluginPrompt(text) {
    // DSH 按 chip 所在位置序列化，用户可在引用前后继续输入文字。
    // 只移除通过协议校验的引用块，保留普通文字及损坏的原始内容。
    const webReferences = [];
    let visible = '', cursor = 0;
    while (cursor < text.length) {
        const start = text.indexOf(WEBCHAT_REFERENCE_START, cursor);
        if (start < 0)
            break;
        const referenced = parseWebChatReferencePrompt(text.slice(start));
        const end = referenced === undefined ? start + WEBCHAT_REFERENCE_START.length
            : text.indexOf(WEBCHAT_REFERENCE_END, start) + WEBCHAT_REFERENCE_END.length;
        visible += text.slice(cursor, referenced === undefined ? end : start);
        if (referenced !== undefined)
            webReferences.push(referenced.reference);
        cursor = end;
    }
    visible += text.slice(cursor);
    let message = webReferences.length === 0 ? text : visible.trim();
    let annotations;
    const references = [];
    while (message.length > 0) {
        const annotated = annotations === undefined ? parseAnnotatedConversationPrompt(message) : undefined;
        if (annotated !== undefined) {
            annotations = annotated.annotations;
            message = annotated.message;
            continue;
        }
        const referenced = parseReferencedConversationPrompt(message);
        if (referenced !== undefined) {
            references.push(referenced.reference);
            message = referenced.message;
            continue;
        }
        break;
    }
    if (annotations === undefined && references.length === 0 && webReferences.length === 0)
        return;
    return { ...(annotations === undefined ? {} : { annotations }), references, webReferences, message };
}
/** Wrap DSH's own user renderer only when this plugin's durable prefix exists. */
export function annotatedUserMessageRenderer(Original, locale, onOpenWebChat) {
    return function AnnotatedUserMessageRenderer(props) {
        const { text } = useDshLocale(locale);
        const parsed = parsePluginPrompt(contentText(props.node.data.content));
        if (parsed === undefined)
            return createElement(Original, props);
        const body = parsed.annotations === undefined ? parsed.message : annotationMessageText(parsed.message);
        const visible = [...parsed.references.map(reference => `@${reference.title}`), body]
            .filter(part => part.length > 0).join('\n\n');
        const existingLabels = props.node.data.referenceLabels ?? [];
        const node = {
            ...props.node,
            data: {
                ...props.node.data,
                content: replaceTextContent(props.node.data.content, visible),
                referenceLabels: [...new Set([...parsed.references.map(reference => reference.title), ...existingLabels])],
            },
        };
        const original = createElement(Original, { ...props, node });
        if (parsed.annotations === undefined && parsed.webReferences.length === 0)
            return original;
        return (_jsxs("div", { className: "dsh-more-details-parent-user-message", children: [parsed.webReferences.map(reference => _jsx(WebChatReferenceCard, { reference: reference, locale: locale, ...(onOpenWebChat === undefined ? {} : { onOpen: onOpenWebChat }) }, reference.referenceId)), parsed.annotations === undefined ? null : _jsx(SelectionQuote, { selections: parsed.annotations, messages: SIDE_CHAT_MESSAGES[text('zh-CN', 'en')] }), _jsx("div", { className: "dsh-more-details-parent-user-message-body", children: original })] }));
    };
}
/** Mount the composer capsule and a thin wrapper around DSH's user renderers. */
export function mountParentConversationAnnotations(ctx, removeAnnotations, onOpenWebChat) {
    const slots = ctx.slots;
    const removeDock = slots.inject('conversation.input.dock', () => slots.register({
        name: 'conversation.input.dock',
        id: 'dsh-more-details-annotations',
        // This zero-height projection must follow Todo (0), Goal (10), and Queue
        // (20), so its absolute child remains anchored to the input card below.
        order: 30,
    }, ({ input, session }) => (_jsxs(_Fragment, { children: [_jsx(WebChatDraftReferences, { input: input, locale: ctx.locale, ...(onOpenWebChat === undefined ? {} : { onOpen: onOpenWebChat }) }), _jsx(ParentComposerAnnotations, { input: input, locale: ctx.locale, onRemove: () => removeAnnotations(SessionId(session.sessionId)) })] }))));
    const shadow = (key) => slots.inject('conversation.chat.node', () => {
        let cachedOriginal;
        let CachedRenderer;
        const ShadowedUserMessage = (props) => {
            // Built-in keyed renderers can register after this declaration callback.
            // Resolve the next-priority renderer at render time so load order does
            // not decide whether annotations are projected.
            const original = slots.entries('conversation.chat.node')
                .find(entry => entry.options.key === key
                && entry.component !== ShadowedUserMessage
                && (entry.options.priority ?? 0) >= 0)
                ?.component;
            if (original === undefined)
                return null;
            if (original !== cachedOriginal || CachedRenderer === undefined) {
                cachedOriginal = original;
                CachedRenderer = annotatedUserMessageRenderer(cachedOriginal, ctx.locale, onOpenWebChat);
            }
            return createElement(CachedRenderer, props);
        };
        return slots.register({
            name: 'conversation.chat.node',
            key,
            priority: -100,
            locale: 'conversation',
        }, ShadowedUserMessage);
    });
    const removeUser = shadow('user');
    const removeSteering = shadow('steering');
    return () => {
        removeSteering();
        removeUser();
        removeDock();
    };
}
