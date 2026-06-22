/**
 * Lightweight, dependency-free i18n. A LanguageProvider holds the active language
 * (persisted to localStorage, defaulting from the browser locale) and exposes a
 * `t(key, vars?)` translator over the merged ./messages dictionaries. Missing keys
 * fall back to English, then to the key itself, so a stray key never crashes the UI.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { messages, type Lang } from './messages'

const STORAGE_KEY = 'wcc.lang'

function detectInitial(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'es') return saved
  } catch {
    /* localStorage unavailable */
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es')) {
      return 'es'
    }
  } catch {
    /* navigator unavailable */
  }
  return 'en'
}

export type TranslateVars = Record<string, string | number>
export type Translate = (key: string, vars?: TranslateVars) => string

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translate
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitial)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* non-persistent, still applies for the session */
    }
  }, [])

  useEffect(() => {
    try {
      document.documentElement.lang = lang
    } catch {
      /* no document (test env) */
    }
  }, [lang])

  const t = useCallback<Translate>(
    (key, vars) => {
      const raw = messages[lang][key] ?? messages.en[key] ?? key
      if (!vars) return raw
      return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
        vars[name] != null ? String(vars[name]) : `{${name}}`,
      )
    },
    [lang],
  )

  const value = useMemo<LanguageContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

/** Access the active language + translator. Must be used within <LanguageProvider>. */
export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider')
  return ctx
}

export type { Lang }
