import { useState } from 'react'
import { useLang } from '../../i18n'
import { Button } from '../../atoms/Button'
import type { MpPhase } from '../../multiplayer/useMultiplayerMatch'

interface MultiplayerLobbyProps {
  phase: MpPhase
  roomCode: string | null
  error: string | null
  /** The signed-in account name shown and used for this match. */
  playerName: string
  onCreate: () => void
  onJoin: (code: string) => void
  onBack: () => void
}

/**
 * Pre-match lobby: create a room (and share the code while waiting) or join one by code. The
 * display name comes from the signed-in account (Multiplayer is gated on login). Shown after the
 * deck is built.
 */
export function MultiplayerLobby({ phase, roomCode, error, playerName, onCreate, onJoin, onBack }: MultiplayerLobbyProps) {
  const { t } = useLang()
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  // Creator is waiting in a room: show the code + waiting state.
  if (phase === 'lobby' && roomCode) {
    return (
      <div className="menu-screen mp-lobby">
        <div className="mp-panel" style={{ alignItems: 'center', textAlign: 'center' }}>
          <h1>{t('mp.lobby.yourCode')}</h1>
          <div className="mp-code">{roomCode}</div>
          <Button
            variant="ghost"
            onClick={() => {
              void navigator.clipboard?.writeText(roomCode).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              })
            }}
          >
            {copied ? t('mp.lobby.copied') : t('mp.lobby.copy')}
          </Button>
          <p className="note">{t('mp.lobby.share')}</p>
          <p className="note mp-waiting" role="status">{t('mp.lobby.waiting')}</p>
          <Button variant="ghost" onClick={onBack}>{t('mp.lobby.back')}</Button>
        </div>
      </div>
    )
  }

  if (phase === 'connecting') {
    return (
      <div className="menu-screen mp-lobby">
        <div className="mp-panel" style={{ alignItems: 'center' }}>
          <p className="note" role="status">{t('mp.lobby.connecting')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="menu-screen mp-lobby">
      <div className="mp-panel">
        <div style={{ textAlign: 'center' }}>
          <h1>{t('mp.menu.title')}</h1>
          <p className="note" style={{ marginTop: 8 }}>{t('mp.menu.subtitle')}</p>
          <p className="note mp-playing-as">{t('mp.lobby.playingAs', { name: playerName })}</p>
        </div>

        <Button variant="gold" size="big" onClick={onCreate}>
          {t('mp.lobby.create')}
        </Button>

        <div className="mp-divider"><span>{t('mp.lobby.or')}</span></div>

        <div className="mp-row">
          <label className="mp-field" style={{ flex: 1 }}>
            <span className="note">{t('mp.lobby.codeLabel')}</span>
            <input
              className="mp-input"
              type="text"
              value={code}
              maxLength={6}
              placeholder={t('mp.lobby.codePlaceholder')}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>
          <Button
            variant="primary"
            onClick={() => code.trim() && onJoin(code.trim())}
          >
            {t('mp.lobby.joinCta')}
          </Button>
        </div>

        {error && <p className="qp-error" role="alert">{error}</p>}

        <Button variant="ghost" onClick={onBack}>{t('mp.lobby.back')}</Button>
      </div>
    </div>
  )
}
