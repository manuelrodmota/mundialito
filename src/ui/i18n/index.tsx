/* eslint-disable react-refresh/only-export-components -- context module: the provider
   component and the useLang hook are intentionally colocated so consumers import both
   from `../i18n`. (Rule only affects Fast Refresh granularity, not correctness.) */
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

function translate(lang: Lang, key: string, vars?: TranslateVars): string {
  const raw = messages[lang][key] ?? messages.en[key] ?? key
  if (!vars) return raw
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] != null ? String(vars[name]) : `{${name}}`,
  )
}

// Default to English with a no-op setter so components rendered outside a provider
// (e.g. in isolated unit tests) degrade to English instead of throwing.
const DEFAULT_VALUE: LanguageContextValue = {
  lang: 'en',
  setLang: () => {},
  t: (key, vars) => translate('en', key, vars),
}

const LanguageContext = createContext<LanguageContextValue>(DEFAULT_VALUE)

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

  const t = useCallback<Translate>((key, vars) => translate(lang, key, vars), [lang])

  const value = useMemo<LanguageContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

/** Access the active language + translator. Outside a provider it degrades to English. */
export function useLang(): LanguageContextValue {
  return useContext(LanguageContext)
}

export type { Lang }
