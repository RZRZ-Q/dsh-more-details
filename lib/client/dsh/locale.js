import { useCallback, useSyncExternalStore } from 'react';
/** 跟随 DSH 已解析的用户语言设置，并使用官方语言包回退链。 */
export function useDshLocale(locale) {
    const subscribe = useCallback((listener) => locale.subscribe(listener), [locale]);
    const getSnapshot = useCallback(() => locale.getSnapshot(), [locale]);
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return {
        active: snapshot.active,
        text: (zh, en) => locale.resolveText({ zh, en }),
    };
}
