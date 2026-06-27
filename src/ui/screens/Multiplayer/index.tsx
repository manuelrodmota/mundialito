import { useState, useCallback } from 'react'
import type { Card } from '../../../engine/types'
import { laneFx } from '../../../engine'
import { useLang } from '../../i18n'
import { useMultiplayerMatch } from '../../multiplayer/useMultiplayerMatch'
import { DeckBuilder } from '../DeckBuilder'
import { MultiplayerLobby } from '../../organisms/MultiplayerLobby'
import { MatchBoard } from '../../organisms/MatchBoard'
import { ResultScreen } from '../ResultScreen'

interface MultiplayerProps {
  onBack: () => void
}

/**
 * Multiplayer (1v1) container — orchestrates: deck builder → lobby (create/join) → match → result.
 * The authoritative match runs server-side (the `mp` Edge Function); this screen owns the
 * useMultiplayerMatch hook and routes between the deck/lobby pre-match flow and the live match,
 * which is driven entirely by the server's Realtime projections.
 */
export function Multiplayer({ onBack }: MultiplayerProps) {
  const { t } = useLang()
  const [preMatch, setPreMatch] = useState<'deckbuilder' | 'lobby'>('deckbuilder')
  const [deck, setDeck] = useState<Card[] | null>(null)
  const [captainId, setCaptainId] = useState<string | null>(null)

  const {
    viewState,
    createRoom,
    joinRoom,
    commitTurn,
    continueAfterReveal,
    rematch,
    leave,
  } = useMultiplayerMatch()

  const handleDeckReady = useCallback((built: Card[], capId: string) => {
    setDeck(built)
    setCaptainId(capId)
    setPreMatch('lobby')
  }, [])

  const handleCreate = useCallback((name: string) => {
    if (deck && captainId) void createRoom(deck, captainId, name)
  }, [deck, captainId, createRoom])

  const handleJoin = useCallback((code: string, name: string) => {
    if (deck && captainId) void joinRoom(code, deck, captainId, name)
  }, [deck, captainId, joinRoom])

  const handleLeave = useCallback(() => {
    leave()
    onBack()
  }, [leave, onBack])

  // ── Live match (server-driven) ──────────────────────────────────────────────
  const inMatch = viewState.phase === 'planning' || viewState.phase === 'reveal'

  if (inMatch && viewState.match) {
    return (
      <>
        <MatchBoard
          match={viewState.match}
          onCommit={(opts) => void commitTurn(opts)}
          onNextRound={continueAfterReveal}
          canCommit={viewState.canCommit}
          opponentIntent={null}
          revealBoards={viewState.revealBoards}
          roundReport={viewState.roundReport}
          phase={viewState.boardPhase}
          laneFx={laneFx}
          onSurrender={handleLeave}
          surrenderKind="match"
          mpMode
          mpWaiting={viewState.youLockedIn && viewState.boardPhase === 'playing'}
          mpOpponentStatus={{
            lockedIn: viewState.opponentLockedIn,
            playedTacticals: viewState.opponentPlayedTacticals,
          }}
          planDeadline={viewState.planDeadline}
        />
        {viewState.error && <div className="qp-error" role="alert">{viewState.error}</div>}
      </>
    )
  }

  if (viewState.phase === 'result' && viewState.match) {
    return (
      <ResultScreen
        match={viewState.match}
        onRematch={() => void rematch()}
        onBack={handleLeave}
      />
    )
  }

  if (viewState.phase === 'abandoned') {
    return (
      <div className="menu-screen mp-abandoned">
        <div className="mp-panel" style={{ alignItems: 'center', textAlign: 'center' }}>
          <h1>{t('mp.abandoned.title')}</h1>
          <p className="note">{t('mp.abandoned.body')}</p>
          <button type="button" className="btn btn-gold btn-big" onClick={handleLeave}>
            {t('mp.result.leave')}
          </button>
        </div>
      </div>
    )
  }

  // ── Pre-match (deck → lobby) ────────────────────────────────────────────────
  if (preMatch === 'deckbuilder') {
    return <DeckBuilder onDeckReady={handleDeckReady} onBack={onBack} />
  }

  return (
    <MultiplayerLobby
      phase={viewState.phase}
      roomCode={viewState.roomCode}
      error={viewState.error}
      onCreate={handleCreate}
      onJoin={handleJoin}
      onBack={handleLeave}
    />
  )
}
