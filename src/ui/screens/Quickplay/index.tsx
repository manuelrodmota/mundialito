import { useState, useCallback } from 'react'
import type { Card } from '../../../engine/types'
import { laneFx } from '../../../engine'
import { useQuickplayMatch } from '../../quickplay/useQuickplayMatch'
import { DeckBuilder } from '../DeckBuilder'
import { DifficultyPicker } from '../DifficultyPicker'
import { MatchBoard } from '../../organisms/MatchBoard'
import { ResultScreen } from '../ResultScreen'
import { GoalCelebration } from '../../organisms/GoalCelebration'
import type { GoalEvent } from '../../quickplay/useQuickplayMatch'

type QuickplaySubScreen = 'deckbuilder' | 'difficulty' | 'match' | 'result'

interface QuickplayProps {
  onBack: () => void
}

/** Quickplay container — orchestrates the full loop:
 *  deck builder → difficulty picker → match board → result → rematch.
 *  Owns the useQuickplayMatch hook and routes sub-screens.
 */
export function Quickplay({ onBack }: QuickplayProps) {
  const [subScreen, setSubScreen] = useState<QuickplaySubScreen>('deckbuilder')
  const [builtDeck, setBuiltDeck] = useState<Card[] | null>(null)
  const [captainId, setCaptainId] = useState<string | null>(null)
  const [pendingGoals, setPendingGoals] = useState<GoalEvent[]>([])

  const {
    viewState,
    difficulty,
    setDifficulty,
    start,
    commitTurn,
    resolveCurrentRound,
    rematch,
  } = useQuickplayMatch()

  const handleDeckReady = useCallback((deck: Card[], capId: string) => {
    setBuiltDeck(deck)
    setCaptainId(capId)
    setSubScreen('difficulty')
  }, [])

  const handleKickOff = useCallback(async () => {
    if (!builtDeck || !captainId) return
    await start(builtDeck, captainId, difficulty)
    setSubScreen('match')
  }, [builtDeck, captainId, difficulty, start])

  const handleCommit = useCallback(
    (opts: Parameters<typeof commitTurn>[0]) => {
      commitTurn(opts)
      resolveCurrentRound()

      if (viewState.match?.winner !== null) {
        setSubScreen('result')
      } else {
        const newGoals = viewState.goalEvents.slice(pendingGoals.length)
        if (newGoals.length > 0) {
          setPendingGoals(newGoals)
        }
      }
    },
    [commitTurn, resolveCurrentRound, viewState, pendingGoals.length],
  )

  const handleGoalDismiss = useCallback(() => {
    setPendingGoals((prev) => prev.slice(1))
  }, [])

  const handleRematch = useCallback(async () => {
    await rematch()
    setPendingGoals([])
    setSubScreen('match')
  }, [rematch])

  if (subScreen === 'deckbuilder') {
    return (
      <DeckBuilder
        onDeckReady={handleDeckReady}
        onBack={onBack}
      />
    )
  }

  if (subScreen === 'difficulty') {
    return (
      <DifficultyPicker
        selected={difficulty}
        onSelect={setDifficulty}
        onConfirm={handleKickOff}
        onBack={() => setSubScreen('deckbuilder')}
        loading={viewState.phase === 'loading'}
      />
    )
  }

  if (subScreen === 'match' && viewState.match) {
    return (
      <>
        <GoalCelebration
          events={pendingGoals}
          onDismiss={handleGoalDismiss}
        />
        <MatchBoard
          match={viewState.match}
          onCommit={handleCommit}
          canCommit={viewState.canCommit}
          laneFx={laneFx}
        />
        {viewState.error && (
          <div className="qp-error" role="alert">
            {viewState.error}
          </div>
        )}
      </>
    )
  }

  if (subScreen === 'result' && viewState.match?.winner !== null && viewState.match) {
    return (
      <ResultScreen
        match={viewState.match}
        onRematch={handleRematch}
        onBack={onBack}
      />
    )
  }

  if (viewState.error) {
    return (
      <div className="qp-error" role="alert">
        <p>{viewState.error}</p>
        <button type="button" onClick={onBack}>Back to Menu</button>
      </div>
    )
  }

  return (
    <div className="qp-loading">
      <p>Starting match…</p>
    </div>
  )
}
