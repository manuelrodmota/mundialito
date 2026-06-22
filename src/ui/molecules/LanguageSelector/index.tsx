import { useLang } from '../../i18n'
import './languageSelector.css'

/** Simplified Union Jack — recognizable at icon size, fully self-contained (no emoji,
 *  which don't render as flags on every platform). */
function FlagEN() {
  return (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#012169" />
      <path d="M0,0 30,20 M30,0 0,20" stroke="#fff" strokeWidth="4" />
      <path d="M0,0 30,20 M30,0 0,20" stroke="#c8102e" strokeWidth="2" />
      <path d="M15,0 V20 M0,10 H30" stroke="#fff" strokeWidth="6" />
      <path d="M15,0 V20 M0,10 H30" stroke="#c8102e" strokeWidth="3.5" />
    </svg>
  )
}

/** Flag of Spain (red / yellow / red, 1:2:1). */
function FlagES() {
  return (
    <svg viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#aa151b" />
      <rect y="5" width="30" height="10" fill="#f1bf00" />
    </svg>
  )
}

/** Two-flag language toggle. The active language is highlighted; tapping the other
 *  switches (and persists) the app language via the i18n context. */
export function LanguageSelector() {
  const { lang, setLang, t } = useLang()

  return (
    <div className="lang-selector" role="group" aria-label="Language">
      <button
        type="button"
        className={`lang-flag${lang === 'en' ? ' on' : ''}`}
        aria-pressed={lang === 'en'}
        aria-label={t('lang.switchTo', { lang: t('lang.english') })}
        title="English"
        onClick={() => setLang('en')}
      >
        <FlagEN />
      </button>
      <button
        type="button"
        className={`lang-flag${lang === 'es' ? ' on' : ''}`}
        aria-pressed={lang === 'es'}
        aria-label={t('lang.switchTo', { lang: t('lang.spanish') })}
        title="Español"
        onClick={() => setLang('es')}
      >
        <FlagES />
      </button>
    </div>
  )
}
