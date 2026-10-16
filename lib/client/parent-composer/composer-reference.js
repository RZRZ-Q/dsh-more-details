/** 接受返回值与已提交快照是两个时点；订阅后再编辑，兼容 Lexical 外层批次提交。 */
export function editComposerWithCommit(input, edit, committed) {
    const revision = input.state.getSnapshot().draftRev;
    let accepted = false, complete = false;
    let unsubscribe = () => { };
    const check = () => {
        if (!accepted || complete)
            return;
        const snapshot = input.state.getSnapshot();
        if (snapshot.draftRev === revision)
            return;
        complete = true;
        unsubscribe();
        committed(snapshot);
    };
    unsubscribe = input.state.subscribe(check);
    try {
        accepted = edit();
    }
    catch (error) {
        unsubscribe();
        throw error;
    }
    if (accepted)
        check();
    else
        unsubscribe();
    return accepted;
}
export function occurrenceRange(snapshot, occurrence, expectedLabel) {
    const { offset, length } = occurrence;
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length)
        || offset < 0 || length < 0 || offset + length > snapshot.draft.length
        || occurrence.label !== expectedLabel
        || snapshot.draft.slice(offset, offset + length) !== occurrence.clipboardText)
        return;
    return { start: offset, end: offset + length };
}
export function occurrenceMatchesDraft(snapshot, occurrence, expectedLabel) {
    return occurrenceRange(snapshot, occurrence, expectedLabel) !== undefined;
}
/** Convert a reference's clipboard range to the editor's atomic coordinates. */
export function occurrenceEditSpan(_input, snapshot, occurrence, options = {}) {
    const range = occurrenceRange(snapshot, occurrence, occurrence.label);
    if (range === undefined)
        return;
    let start = range.start;
    for (const previous of snapshot.occurrences) {
        if (previous.offset >= occurrence.offset)
            continue;
        if (occurrenceRange(snapshot, previous, previous.label) === undefined
            || previous.offset + previous.length > occurrence.offset)
            return;
        start -= previous.length - 1;
    }
    let end = start + 1;
    if (options.consumeFollowingSeparator && snapshot.draft[range.end] === ' ')
        end += 1;
    return { start, end, draftRev: snapshot.draftRev };
}
export function newlyInsertedOccurrence(before, after, source, ref) {
    const previousIds = new Set(before.occurrences.map(occurrence => occurrence.occurrenceId));
    const inserted = after.occurrences.filter(occurrence => !previousIds.has(occurrence.occurrenceId)
        && occurrence.source === source && occurrence.ref === ref);
    return inserted.length === 1 ? inserted[0] : undefined;
}
