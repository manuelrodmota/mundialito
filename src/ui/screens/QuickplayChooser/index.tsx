import { useLang } from '../../i18n'
import { useAuth } from '../../../auth/AuthProvider'
import { Icon } from '../../atoms/Icon'

interface QuickplayChooserProps {
  /** Build from the full pool (all players, no login). */
  onAll: () => void
  /** Build from the signed-in player's collection. */
  onOwned: () => void
  onBack: () => void
  /** Disable while owned cards are loading. */
  loadingOwned?: boolean
}

/** Quickplay squad-source chooser: all players vs your collection (WCC-055). */
export function QuickplayChooser({ onAll, onOwned, onBack, loadingOwned }: QuickplayChooserProps) {
  const { t } = useLang()
  const { status } = useAuth()
  const authed = status === 'authed'

  return (
    <div className="home">
      <div className="stadium-bg" />

      <button className="page-back qp-menu-back" type="button" onClick={onBack}>
        <Icon name="back" size={16} /> {t('quickChoose.menu')}
      </button>

      <div className="logo-block">
        <div className="kicker">{t('menu.quickplay')}</div>
        <h1 className="qp-choose-title">{t('quickChoose.title')}</h1>
        <div className="sub">{t('quickChoose.sub')}</div>
      </div>

      <div className="menu-grid qp-choose-grid">
        <button className="tile primary" type="button" onClick={onAll}>
          <span className="tile-ic"><Icon name="play" /></span>
          <span className="tile-name">{t('quickChoose.allTitle')}</span>
          <span className="tile-desc">{t('quickChoose.allDesc')}</span>
        </button>

        <button
          className={`tile ${authed ? '' : 'locked'}`}
          type="button"
          onClick={authed && !loadingOwned ? onOwned : undefined}
          aria-disabled={!authed || loadingOwned}
        >
          {!authed && <span className="lock-badge"><Icon name="lock" /></span>}
          <span className="tile-ic"><Icon name="collection" /></span>
          <span className="tile-name">{t('quickChoose.ownedTitle')}</span>
          <span className="tile-desc">
            {!authed
              ? t('quickChoose.ownedLocked')
              : loadingOwned
                ? t('quickChoose.ownedLoading')
                : t('quickChoose.ownedDesc')}
          </span>
        </button>
      </div>
    </div>
  )
}
