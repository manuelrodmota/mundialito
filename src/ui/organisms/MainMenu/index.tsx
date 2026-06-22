import { Button } from '../../atoms/Button'
import { LanguageSelector } from '../../molecules/LanguageSelector'
import { useLang } from '../../i18n'

interface MainMenuProps {
  onQuickplay: () => void
  onArcade?: () => void
  onCollection?: () => void
  onHowToPlay?: () => void
}

/** Main mode-select screen — entry point for Quickplay, Arcade Run, Collection, and How to Play. */
export function MainMenu({ onQuickplay, onArcade, onCollection, onHowToPlay }: MainMenuProps) {
  const { t } = useLang()

  return (
    <div className="menu-screen">
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 5 }}>
        <LanguageSelector />
      </div>

      <div style={{ textAlign: 'center', marginBottom: 8, position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: 36, margin: 0 }}>World Cup Clash</h1>
        <p className="note" style={{ margin: '8px 0 0' }}>
          {t('menu.tagline')}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 12,
          width: '100%',
          maxWidth: 320,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Button variant="gold" size="big" onClick={onQuickplay}>
          {t('menu.quickplay')}
        </Button>

        <Button variant="primary" size="big" onClick={onArcade}>
          {t('menu.arcade')}
        </Button>

        <Button variant="ghost" onClick={onCollection}>
          {t('menu.collection')}
        </Button>

        <Button variant="ghost" onClick={onHowToPlay}>
          {t('menu.howToPlay')}
        </Button>
      </div>
    </div>
  )
}
