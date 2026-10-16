import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
function clamp(value, minimum, maximum) {
    return Math.min(Math.max(minimum, value), Math.max(minimum, maximum));
}
export function calculateSelectionActionsPosition(rect, size, touch, viewport = {
    width: rect.viewportWidth,
    height: rect.viewportHeight,
}) {
    const edge = 8;
    const width = Math.max(0, size.width);
    const height = Math.max(0, size.height);
    // Range and fixed-position coordinates use the layout viewport origin. A
    // visual viewport must therefore contribute both its size and its offset.
    const viewportLeft = viewport.offsetLeft ?? 0;
    const viewportTop = viewport.offsetTop ?? 0;
    const viewportRight = viewportLeft + viewport.width;
    const viewportBottom = viewportTop + viewport.height;
    const left = clamp(rect.x + rect.width / 2 - width / 2, viewportLeft + edge, viewportRight - width - edge);
    const belowGap = touch ? 12 : 8;
    const aboveGap = touch ? 64 : 8;
    const below = rect.y + rect.height + belowGap;
    const above = rect.y - height - aboveGap;
    const belowFits = below + height <= viewportBottom - edge;
    const aboveFits = above >= viewportTop + edge;
    let top;
    if (belowFits)
        top = below;
    else if (aboveFits)
        top = above;
    else {
        const roomAbove = rect.y - aboveGap - viewportTop - edge;
        const roomBelow = viewportBottom - edge - rect.y - rect.height - belowGap;
        top = roomAbove >= roomBelow ? above : below;
    }
    return {
        left,
        top: clamp(top, viewportTop + edge, viewportBottom - height - edge),
    };
}
export function SelectionActions({ text, selection, touchInteraction = false, askDisabledReason, moreDetailsDisabledReason, annotationNumber = 1, annotationEditor, onAddToChat, onMoreDetails, onAskInSideChat, onAnnotationEditorChange, onRemoveAnnotation, onDismiss, }) {
    const [editingAnnotation, setEditingAnnotation] = useState(annotationEditor !== undefined);
    const [comment, setComment] = useState(annotationEditor?.initialComment ?? '');
    const [toolbarSize, setToolbarSize] = useState(() => ({
        width: 0,
        height: 0,
    }));
    const [viewport, setViewport] = useState(() => ({
        width: selection.rect.viewportWidth,
        height: selection.rect.viewportHeight,
        offsetLeft: 0,
        offsetTop: 0,
    }));
    const commentRef = useRef(null);
    const toolbarRef = useRef(null);
    const touchActivationRef = useRef(null);
    const toolbarPosition = calculateSelectionActionsPosition(selection.rect, toolbarSize, touchInteraction, viewport);
    const style = {
        left: toolbarPosition.left,
        top: toolbarPosition.top,
    };
    const viewportLeft = viewport.offsetLeft;
    const viewportTop = viewport.offsetTop;
    const viewportRight = viewportLeft + viewport.width;
    const viewportBottom = viewportTop + viewport.height;
    const editorEdge = 8;
    const editorHeight = 118;
    const editorWidth = Math.max(0, Math.min(420, viewport.width - editorEdge * 2));
    const editorAbove = selection.rect.y - editorHeight;
    const editorBelow = selection.rect.y + selection.rect.height + 12;
    const editorStyle = {
        left: clamp(selection.rect.x + selection.rect.width + 28, viewportLeft + editorEdge, viewportRight - editorWidth - editorEdge),
        top: clamp(editorAbove >= viewportTop + editorEdge ? editorAbove : editorBelow, viewportTop + editorEdge, viewportBottom - editorHeight - editorEdge),
        width: editorWidth,
    };
    const markerEdge = 4;
    const markerSize = 22;
    const markerStyle = {
        left: clamp(selection.rect.x + selection.rect.width + 3, viewportLeft + markerEdge, viewportRight - markerSize - markerEdge),
        top: clamp(selection.rect.y - 12, viewportTop + markerEdge, viewportBottom - markerSize - markerEdge),
    };
    const markerNumber = annotationNumber > 99 ? '99+' : String(annotationNumber);
    const keepSelection = (event) => { event.preventDefault(); };
    useLayoutEffect(() => {
        const visualViewport = window.visualViewport;
        const measure = () => {
            const nextViewport = {
                width: visualViewport?.width ?? window.innerWidth ?? selection.rect.viewportWidth,
                height: visualViewport?.height ?? window.innerHeight ?? selection.rect.viewportHeight,
                offsetLeft: visualViewport?.offsetLeft ?? 0,
                offsetTop: visualViewport?.offsetTop ?? 0,
            };
            setViewport(current => current.width === nextViewport.width
                && current.height === nextViewport.height
                && current.offsetLeft === nextViewport.offsetLeft
                && current.offsetTop === nextViewport.offsetTop
                ? current
                : nextViewport);
            const toolbar = toolbarRef.current;
            if (toolbar === null)
                return;
            const bounds = toolbar.getBoundingClientRect();
            const nextSize = { width: bounds.width, height: bounds.height };
            setToolbarSize(current => current.width === nextSize.width
                && current.height === nextSize.height
                ? current
                : nextSize);
        };
        measure();
        const toolbar = toolbarRef.current;
        const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
        if (toolbar !== null)
            observer?.observe(toolbar);
        window.addEventListener('resize', measure);
        visualViewport?.addEventListener('resize', measure);
        visualViewport?.addEventListener('scroll', measure);
        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', measure);
            visualViewport?.removeEventListener('resize', measure);
            visualViewport?.removeEventListener('scroll', measure);
        };
    }, [editingAnnotation, selection, touchInteraction]);
    useEffect(() => {
        if (editingAnnotation)
            commentRef.current?.focus();
    }, [editingAnnotation]);
    const closeEditor = () => {
        setEditingAnnotation(false);
        setComment('');
        onAnnotationEditorChange?.(false);
        onDismiss();
    };
    const saveAnnotation = () => {
        const trimmed = comment.trim();
        onAddToChat(selection, trimmed.length === 0 ? undefined : trimmed);
        onAnnotationEditorChange?.(false);
        onDismiss();
    };
    const submitAnnotation = (event) => {
        event.preventDefault();
        saveAnnotation();
    };
    const annotationKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            closeEditor();
            return;
        }
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing
            && event.keyCode !== 229) {
            event.preventDefault();
            saveAnnotation();
        }
    };
    const openAnnotationEditor = () => {
        setEditingAnnotation(true);
        onAnnotationEditorChange?.(true);
    };
    const showMoreDetails = () => {
        onMoreDetails(selection);
        onDismiss();
    };
    const askInSideChat = () => {
        onAskInSideChat(selection);
        onDismiss();
    };
    const activateOnTouch = (event, action) => {
        if (!touchInteraction || event.pointerType !== 'touch' || event.currentTarget.disabled)
            return;
        event.preventDefault();
        touchActivationRef.current = {
            target: event.currentTarget,
            timeStamp: event.timeStamp,
        };
        action();
    };
    const activateOnClick = (event, action) => {
        const touchActivation = touchActivationRef.current;
        touchActivationRef.current = null;
        const elapsed = touchActivation === null ? Number.POSITIVE_INFINITY : event.timeStamp - touchActivation.timeStamp;
        if (event.detail !== 0
            && touchActivation?.target === event.currentTarget
            && elapsed >= 0
            && elapsed < 1_000) {
            event.preventDefault();
            return;
        }
        action();
    };
    if (editingAnnotation) {
        return (_jsxs(_Fragment, { children: [annotationEditor === undefined && (_jsx("span", { className: "dsh-more-details-selection-marker", "aria-hidden": "true", "data-large": annotationNumber > 99 || undefined, style: markerStyle, children: markerNumber })), _jsxs("form", { className: "dsh-more-details-selection-comment", role: "dialog", "aria-label": annotationEditor?.dialogLabel ?? text('添加批注', 'Add annotation comment'), style: editorStyle, onSubmit: submitAnnotation, onMouseDown: (event) => { event.stopPropagation(); }, onKeyUp: (event) => { event.stopPropagation(); }, children: [_jsx("textarea", { ref: commentRef, value: comment, rows: 2, "aria-label": text('批注内容（可选）', 'Optional annotation comment'), placeholder: text('添加批注（可选）…', 'Add an optional comment…'), onChange: (event) => { setComment(event.currentTarget.value); }, onKeyDown: annotationKeyDown }), _jsxs("div", { className: "dsh-more-details-selection-comment-actions", children: [annotationEditor !== undefined && onRemoveAnnotation !== undefined && (_jsx("button", { type: "button", onClick: onRemoveAnnotation, children: text('移除', 'Remove') })), _jsx("button", { type: "button", onClick: closeEditor, children: text('取消', 'Cancel') }), _jsx("button", { type: "submit", className: "dsh-more-details-selection-comment-save", children: text('保存', 'Save') })] })] })] }));
    }
    return (_jsxs("div", { ref: toolbarRef, className: "dsh-more-details-selection-actions", role: "toolbar", "aria-label": text('所选会话文字操作', 'Selected conversation text actions'), "data-touch": touchInteraction || undefined, style: style, onMouseDown: keepSelection, onPointerDown: (event) => {
            if (touchInteraction && event.pointerType === 'touch')
                event.preventDefault();
        }, onKeyDown: (event) => {
            if (event.key === 'Escape')
                onDismiss();
        }, children: [_jsx("button", { type: "button", onPointerDown: (event) => { activateOnTouch(event, openAnnotationEditor); }, onClick: (event) => { activateOnClick(event, openAnnotationEditor); }, children: text('添加到聊天', 'Add to chat') }), _jsx("button", { type: "button", disabled: moreDetailsDisabledReason !== undefined, title: moreDetailsDisabledReason, onPointerDown: (event) => { activateOnTouch(event, showMoreDetails); }, onClick: (event) => { activateOnClick(event, showMoreDetails); }, children: text('更多详情', 'More details') }), _jsx("button", { type: "button", disabled: askDisabledReason !== undefined, title: askDisabledReason, onPointerDown: (event) => { activateOnTouch(event, askInSideChat); }, onClick: (event) => { activateOnClick(event, askInSideChat); }, children: text('在侧边对话中提问', 'Ask in side chat') })] }));
}
