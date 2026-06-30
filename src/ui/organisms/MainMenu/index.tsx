import { LanguageSelector } from '../../molecules/LanguageSelector'
import { Icon, GoogleG } from '../../atoms/Icon'
import { useLang } from '../../i18n'
import { useAuth } from '../../../auth/AuthProvider'

interface MainMenuProps {
  onQuickplay: () => void
  onArcade: () => void
  onAccount: () => void
  onMultiplayer: () => void
  onHowToPlay: () => void
}

/**
 * Home menu (WCC-047). Three always-on tiles (Quickplay / Login / How to play) over a
 * gated row (Arcade / Multiplayer / Account) that unlocks once signed in. Reads auth
 * state from `useAuth()`; the Login tile triggers sign-in and shows a "Signed in" state
 * once authed.
 */
export function MainMenu({ onQuickplay, onArcade, onAccount, onMultiplayer, onHowToPlay }: MainMenuProps) {
  const { t } = useLang()
  const { status, user, signInWithGoogle } = useAuth()
  const authed = status === 'authed'

  return (
    <div className="home">
      <div className="stadium-bg" />

      <div className="home-lang">
        <LanguageSelector />
      </div>

      <div className="logo-block">
        <div className="kicker">{t('meta.kicker')}</div>
        <h1>{t('common.appName')}</h1>
        <div className="sub">{t('meta.menuSub')}</div>
      </div>

      <div className="menu-grid">
        {/* Top row — always available */}
        <button className="tile primary" onClick={onQuickplay}>
          <span className="tile-ic"><Icon name="play" /></span>
          <span className="tile-name">{t('menu.quickplay')}</span>
          <span className="tile-desc">{t('meta.quickplayDesc')}</span>
        </button>

        <button
          className="tile brand"
          onClick={authed ? undefined : signInWithGoogle}
          disabled={authed}
          style={authed ? { opacity: 0.55, cursor: 'default' } : undefined}
        >
          <span className="tile-ic">{authed ? <Icon name="check" /> : <GoogleG size={28} />}</span>
          <span className="tile-name">{authed ? t('meta.signedIn') : t('meta.loginGoogle')}</span>
          <span className="tile-desc">
            {authed ? t('meta.signedInAs', { name: user?.displayName ?? '' }) : t('meta.loginDesc')}
          </span>
        </button>

        <button className="tile" onClick={onHowToPlay}>
          <span className="tile-ic"><Icon name="help" /></span>
          <span className="tile-name">{t('menu.howToPlay')}</span>
          <span className="tile-desc">{t('meta.howToDesc')}</span>
        </button>

        {/* Divider */}
        <div className="group-label">{authed ? t('meta.yourModes') : t('meta.unlocksAfterLogin')}</div>

        {/* Gated row — unlocks after login */}
        <button
          className={`tile ${authed ? '' : 'locked'}`}
          onClick={authed ? onArcade : undefined}
          aria-disabled={!authed}
        >
          {!authed && <span className="lock-badge"><Icon name="lock" /></span>}
          <span className="tile-ic"><Icon name="arcade" /></span>
          <span className="tile-name">{t('menu.arcade')}</span>
          <span className="tile-desc">{t('meta.arcadeDesc')}</span>
        </button>

        <button
          className={`tile ${authed ? '' : 'locked'}`}
          onClick={authed ? onMultiplayer : undefined}
          aria-disabled={!authed}
        >
          {!authed && <span className="lock-badge"><Icon name="lock" /></span>}
          <span className="tile-ic"><Icon name="multiplayer" /></span>
          <span className="tile-name">{t('meta.multiplayer')}</span>
          <span className="tile-desc">{t('meta.multiplayerDesc')}</span>
        </button>

        <button
          className={`tile ${authed ? '' : 'locked'}`}
          onClick={authed ? onAccount : undefined}
          aria-disabled={!authed}
        >
          {!authed && <span className="lock-badge"><Icon name="lock" /></span>}
          {authed && <span className="new-badge">{t('meta.welcomeBoxesBadge')}</span>}
          <span className="tile-ic"><Icon name="account" /></span>
          <span className="tile-name">{t('meta.account')}</span>
          <span className="tile-desc">{t('meta.accountDesc')}</span>
        </button>
      </div>
    </div>
  )
}
