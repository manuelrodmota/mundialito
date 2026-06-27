import { useState } from 'react'
import { useLang } from '../../i18n'
import { Button } from '../../atoms/Button'
import type { MpPhase } from '../../multiplayer/useMultiplayerMatch'

interface MultiplayerLobbyProps {
  phase: MpPhase
  roomCode: string | null
  error: string | null
  onCreate: (name: string) => void
  onJoin: (code: string, name: string) => void
  onBack: () => void
}

/**
 * Pre-match lobby: pick a display name, then either create a room (and share the code while
 * waiting) or join an existing one by code. Shown after the deck is built.
 */
export function MultiplayerLobby({ phase, roomCode, error, onCreate, onJoin, onBack }: MultiplayerLobbyProps) {
  const { t } = useLang()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  const displayName = name.trim() || t('mp.lobby.namePlaceholder')

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
        </div>

        <label className="mp-field">
          <span className="note">{t('mp.lobby.nameLabel')}</span>
          <input
            className="mp-input"
            type="text"
            value={name}
            maxLength={16}
            placeholder={t('mp.lobby.namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <Button variant="gold" size="big" onClick={() => onCreate(displayName)}>
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
            onClick={() => code.trim() && onJoin(code.trim(), displayName)}
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
