import { useLang } from '../../i18n'

/**
 * Rotate-to-landscape gate. Drop this anywhere inside a screen that was designed
 * for a horizontal layout (DeckBuilder, the match board, …). It renders a full-screen
 * overlay that is **invisible by default** and only surfaces on portrait phones — all
 * visibility is driven by CSS media queries in `responsive.css` (`.rotate-gate`), so it
 * reacts to device rotation instantly with no JS resize listener.
 *
 * Portrait-friendly screens (splash, menu, how-to-play) simply don't mount it.
 */
export function LandscapeGate() {
  const { t } = useLang()
  return (
    <div className="rotate-gate" role="alertdialog" aria-label={t('common.rotateTitle')}>
      <div className="rotate-gate-inner">
        <svg
          className="rotate-gate-phone"
          width="76"
          height="76"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* phone body */}
          <rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 18.5 h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          {/* curved rotation arrow hugging the phone */}
          <path
            d="M3.5 9 a8 8 0 0 1 4 -4.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path d="M3.2 6.2 L3.5 9 L6.3 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
        </svg>
        <h2 className="rotate-gate-title">{t('common.rotateTitle')}</h2>
        <p className="rotate-gate-body">{t('common.rotateBody')}</p>
      </div>
    </div>
  )
}
