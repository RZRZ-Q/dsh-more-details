import type { DshLocale } from '../../src/client/dsh/locale.js'

export function localeFixture(active: 'zh' | 'en' = 'en') {
  let snapshot = {
    active,
    locales: [{ id: 'zh', label: '中文', fallback: 'en' }, { id: 'en', label: 'English' }],
    revision: 0,
  }
  const listeners = new Set<() => void>()
  const locale: DshLocale = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    resolveText(value) {
      return typeof value === 'string' ? value : value[snapshot.active] ?? value.en
    },
  }
  return {
    locale,
    setLanguage(language: 'zh' | 'en') {
      snapshot = { ...snapshot, active: language, revision: snapshot.revision + 1 }
      for (const listener of listeners) listener()
    },
  }
}
