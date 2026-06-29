import { useCallback, useEffect, useState } from 'react'
import { useLang } from '../../i18n'
import { USE_STUB_AUTH, useAuth } from '../../../auth/AuthProvider'
import { useAccount } from '../../../account/AccountProvider'
import { TopBar } from '../../organisms/TopBar'
import { RingProgress } from '../../atoms/RingProgress'
import { Icon } from '../../atoms/Icon'
import { Avatar } from '../../atoms/Avatar'
import { TeamPicker } from '../../organisms/TeamPicker'
import { teamBadge } from '../../data/nations'
import { Pack } from '../../organisms/BoxOpening/Pack'
import { BoxOpening, type BoxSpec } from '../../organisms/BoxOpening'
import { xpForLevel, levelBox } from '../../../meta/leveling'
import { BOX_TIERS, type BoxTier } from '../../../meta/boxes'
import { countOpenedBoxes, fetchUnopenedBoxes, type UnopenedBox } from '../../../data/user/userBoxes.repo'
import { fetchCollectionStats } from '../../../data/user/userCards.repo'

interface AccountProps {
  onHome: () => void
  onCollection: () => void
}

const TIER_ORDER: BoxTier[] = ['group', 'knockout', 'champions', 'trophy']

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
/** Prestige rank as a numeral (I–X, then plain numbers beyond). */
function romanize(n: number): string {
  return ROMAN[n] ?? String(n)
}

const PRESTIGE_LEVEL = 50

/**
 * Player home (WCC-049): identity + Log out, XP card, stat row, and the box locker —
 * which now opens boxes (WCC-051/053/054).
 */
export function Account({ onHome, onCollection }: AccountProps) {
  const { t } = useLang()
  const { user, signOut } = useAuth()
  const { profile, refresh: refreshProfile, setFavoriteTeam, prestige } = useAccount()

  const [boxes, setBoxes] = useState<UnopenedBox[]>([])
  const [stats, setStats] = useState({ players: 0, legendaries: 0, boxesOpened: 0 })
  const [queue, setQueue] = useState<BoxSpec[] | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const load = useCallback(() => {
    if (USE_STUB_AUTH) return
    Promise.all([fetchUnopenedBoxes(), fetchCollectionStats(), countOpenedBoxes()])
      .then(([bx, cs, opened]) => {
        setBoxes(bx)
        setStats({ players: cs.total, legendaries: cs.legendaries, boxesOpened: opened })
      })
      .catch(() => {
        /* leave defaults */
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const username = profile?.username ?? user?.displayName ?? 'Player'
  const email = user?.email ?? ''
  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const need = xpForLevel(level)
  const pct = need ? xp / need : 0
  const nextTier = BOX_TIERS[levelBox(level + 1)]
  const prestigeRank = profile?.prestige ?? 0
  const canPrestige = level >= PRESTIGE_LEVEL

  const handlePrestige = () => {
    if (!canPrestige) return
    if (typeof window !== 'undefined' && !window.confirm(t('account.prestigeConfirm'))) return
    void prestige()
  }
  const favoriteTeam = profile?.favoriteTeam ?? null
  const favoriteBadge = favoriteTeam ? teamBadge(favoriteTeam) : null
  const gamesPlayed = profile?.gamesPlayed ?? 0
  const gamesWon = profile?.gamesWon ?? 0
  const winPct = gamesPlayed > 0 ? `${Math.round((gamesWon / gamesPlayed) * 100)}%` : '—'

  const lockerTiers = TIER_ORDER.filter((tk) => boxes.some((b) => b.tier === tk))
  const welcomeBoxes = boxes.filter((b) => b.source === 'welcome')
  const showWelcome = profile != null && !profile.welcomeDone && welcomeBoxes.length > 0

  const toSpec = (b: UnopenedBox): BoxSpec => ({ id: b.id, tier: b.tier, source: b.source })
  const openTier = (tk: BoxTier) => {
    const first = boxes.find((b) => b.tier === tk)
    if (first) setQueue([toSpec(first)])
  }
  const openWelcome = () => {
    if (welcomeBoxes.length) setQueue(welcomeBoxes.map(toSpec))
  }
  const onOpeningDone = () => {
    setQueue(null)
    load()
    void refreshProfile()
  }

  return (
    <div className="scroll-screen">
      <div className="stadium-bg" style={{ position: 'fixed' }} />
      <TopBar onBrand={onHome} username={username} level={level} avatarUrl={user?.avatarUrl} avatarColor={user?.avatarColor} />

      {queue && <BoxOpening queue={queue} onDone={onOpeningDone} />}

      {pickerOpen && (
        <TeamPicker
          current={favoriteTeam}
          onPick={(n) => {
            void setFavoriteTeam(n)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <div className="account">
        <div className="acct-hero">
          <Avatar
            url={user?.avatarUrl}
            letter={username.charAt(0).toUpperCase()}
            color={user?.avatarColor}
            big
          />
          <button
            className={`fav-crest${favoriteTeam ? '' : ' empty'}`}
            type="button"
            onClick={() => setPickerOpen(true)}
            title={favoriteTeam ?? t('account.pickTeam')}
          >
            {favoriteBadge ? (
              <img src={favoriteBadge} alt={favoriteTeam ?? ''} />
            ) : (
              <span className="fav-add">+</span>
            )}
          </button>
          <div>
            <h2>
              {username}
              {prestigeRank > 0 && (
                <span className="prestige-badge" title={t('account.prestigeBadge', { rank: romanize(prestigeRank) })}>
                  ★ {romanize(prestigeRank)}
                </span>
              )}
            </h2>
            {email && <div className="meta">{email}</div>}
          </div>
          <button className="btn btn-ghost acct-logout" type="button" onClick={() => { signOut(); onHome() }}>
            <Icon name="logout" size={18} /> {t('account.logout')}
          </button>
        </div>

        {showWelcome && (
          <div className="welcome-banner">
            <div>
              <div className="wb-title">{t('account.welcomeTitle')}</div>
              <div className="wb-sub">{t('account.welcomeSub', { n: welcomeBoxes.length })}</div>
            </div>
            <button className="btn btn-gold" type="button" onClick={openWelcome}>
              {t('account.openWelcome')}
            </button>
          </div>
        )}

        <div className="xp-card">
          <div className="xp-top">
            <div className="lvl-big">
              <span className="ring">
                <RingProgress pct={pct} size={38} />
              </span>
              {t('account.level', { n: level })}
            </div>
            <div className="xp-num">{t('account.xpCount', { xp, need })}</div>
          </div>
          <div className="xp-bar">
            <i style={{ width: `${Math.min(100, pct * 100)}%` }} />
          </div>
          <div className="next-reward">{t('account.nextReward', { tier: nextTier.name })}</div>
          {canPrestige && (
            <div className="prestige-cta">
              <div className="pc-text">{t('account.prestigeExplain')}</div>
              <button className="btn btn-gold" type="button" onClick={handlePrestige}>
                {t('account.prestigeCta')}
              </button>
            </div>
          )}
        </div>

        <div className="stat-card">
          <div className="stat">
            <div className="v">{stats.players}</div>
            <div className="k">{t('account.statPlayers')}</div>
          </div>
          <span className="stat-sep" />
          <div className="stat">
            <div className="v gold">{stats.legendaries}</div>
            <div className="k">{t('account.statLegendaries')}</div>
          </div>
          <span className="stat-sep" />
          <div className="stat">
            <div className="v">{stats.boxesOpened}</div>
            <div className="k">{t('account.statBoxes')}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat">
            <div className="v">{gamesPlayed}</div>
            <div className="k">{t('account.statGamesPlayed')}</div>
          </div>
          <span className="stat-sep" />
          <div className="stat">
            <div className="v">{gamesWon}</div>
            <div className="k">{t('account.statGamesWon')}</div>
          </div>
          <span className="stat-sep" />
          <div className="stat">
            <div className="v gold">{winPct}</div>
            <div className="k">{t('account.statWinPct')}</div>
          </div>
        </div>

        {lockerTiers.length > 0 && (
          <div className="locker">
            <h3 className="locker-h">{t('account.locker')}</h3>
            <div className="locker-grid">
              {lockerTiers.map((tk) => (
                <Pack
                  key={tk}
                  tier={tk}
                  count={boxes.filter((b) => b.tier === tk).length}
                  onClick={() => openTier(tk)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="acct-actions">
          <button className="btn btn-gold" type="button" onClick={onCollection}>
            <Icon name="collection" size={18} /> {t('account.viewCollection')}
          </button>
        </div>
      </div>
    </div>
  )
}
