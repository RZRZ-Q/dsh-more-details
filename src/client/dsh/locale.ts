import { useCallback, useSyncExternalStore } from 'react'
import type { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'

export type DshLocale = Pick<LocaleRuntime, 'getSnapshot' | 'subscribe' | 'resolveText'>
export type Localize = (zh: string, en: string) => string

/** 跟随 DSH 已解析的用户语言设置，并使用官方语言包回退链。 */
export function useDshLocale(locale: DshLocale): { readonly active: string; readonly text: Localize } {
  const subscribe = useCallback((listener: () => void) => locale.subscribe(listener), [locale])
  const getSnapshot = useCallback(() => locale.getSnapshot(), [locale])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return {
    active: snapshot.active,
    text: (zh, en) => locale.resolveText({ zh, en }),
  }
}
