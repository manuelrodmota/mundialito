import { useLang } from '../../i18n'

interface SplashProps {
  /** Advance to the home menu (any tap / Enter / Space). */
  onEnter: () => void
}

/**
 * Branded title screen — the app's first frame (WCC-046). A single tap target over a
 * stadium-night backdrop. The entrance animates transform only, so the title is never
 * invisible if the animation is interrupted.
 */
export function Splash({ onEnter }: SplashProps) {
  const { t } = useLang()

  return (
    <div
      className="splash"
      role="button"
      tabIndex={0}
      aria-label={t('meta.pressToPlay')}
      onClick={onEnter}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEnter()
        }
      }}
    >
      <div className="stadium-bg" />
      <div className="splash-inner">
        <div className="kicker">{t('meta.kicker')}</div>
        <h1>{t('common.appName')}</h1>
        <div className="splash-cta">
          <span className="dot-pulse" />
          {t('meta.pressToPlay')}
        </div>
      </div>
    </div>
  )
}
