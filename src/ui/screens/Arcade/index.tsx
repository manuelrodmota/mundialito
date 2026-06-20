import { useState, useCallback, useEffect, useRef } from 'react'
import { laneFx } from '../../../engine'
import { useArcadeRun } from '../../run/useArcadeRun'
import type { GoalEvent } from '../../run/useArcadeRun'
import { DeckBuilder } from '../DeckBuilder'
import { RunMap } from '../RunMap'
import { LockerRoom } from '../LockerRoom'
import { RunSummary } from '../RunSummary'
import { MatchBoard } from '../../organisms/MatchBoard'
import { GoalCelebration } from '../../organisms/GoalCelebration'
import type { Card, TacticalCard } from '../../../engine/types'

interface ArcadeProps {
  onHome: () => void
}

/** Arcade Run shell — calls useArcadeRun once and routes on its phase.
 *  Match wiring mirrors the Quickplay container exactly:
 *  GoalCelebration queue, commitTurn staging, reveal separation.
 */
export function Arcade({ onHome }: ArcadeProps) {
  const [pendingGoals, setPendingGoals] = useState<GoalEvent[]>([])
  const consumedRef = useRef(0)

  const {
    viewState,
    startRun,
    startStage,
    commitTurn,
    reveal,
    nextRound,
    claimReward,
    swapTacticalReward,
    setCaptain,
    removeDeckCard,
    proceedToNextStage,
  } = useArcadeRun()

  const { phase, runState, matchSnapshot, reward, nextOpponent } = viewState

  const handleDeckReady = useCallback(
    (deck: Card[], captainId: string) => {
      startRun(deck, captainId)
    },
    [startRun],
  )

  const handleCommit = useCallback(
    (opts: Parameters<typeof commitTurn>[0]) => {
      commitTurn(opts)
    },
    [commitTurn],
  )

  const handleNextRound = useCallback(() => {
    nextRound()
  }, [nextRound])

  // Hold the GOAL blast until the MatchBoard clash + xG floats have played
  // (duel steps land at 0.7s / 1.4s; report at 2.2s). Queuing the full-screen
  // celebration immediately would cover the clash and hide the xG.
  useEffect(() => {
    const all = viewState.goalEvents
    if (all.length > consumedRef.current) {
      const fresh = all.slice(consumedRef.current)
      consumedRef.current = all.length
      const t = setTimeout(() => setPendingGoals((prev) => [...prev, ...fresh]), 1500)
      return () => clearTimeout(t)
    }
  }, [viewState.goalEvents])

  const handleGoalDismiss = useCallback(() => {
    setPendingGoals((prev) => prev.slice(1))
  }, [])

  const handleRestart = useCallback(() => {
    setPendingGoals([])
    consumedRef.current = 0
  }, [])

  if (phase === 'building') {
    return (
      <DeckBuilder
        playerBudget={10}
        tacticalCap={1}
        rosterSize={11}
        onDeckReady={handleDeckReady}
        onBack={onHome}
      />
    )
  }

  if (phase === 'map' && runState) {
    return (
      <RunMap
        runState={runState}
        nextOpponent={nextOpponent}
        onPlayNext={startStage}
        onBack={onHome}
      />
    )
  }

  if (phase === 'match' && matchSnapshot) {
    return (
      <>
        <GoalCelebration
          events={pendingGoals}
          onDismiss={handleGoalDismiss}
        />
        <MatchBoard
          match={matchSnapshot}
          onCommit={handleCommit}
          onReveal={reveal}
          onNextRound={handleNextRound}
          canCommit={viewState.canCommit}
          opponentIntent={viewState.opponentIntent}
          revealBoards={viewState.revealBoards}
          roundReport={viewState.roundReport}
          phase={viewState.revealBoards ? 'reveal' : 'playing'}
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

  if (phase === 'locker' && runState && reward) {
    return (
      <LockerRoom
        reward={reward}
        deck={runState.deck}
        captainId={runState.captainId}
        nextOpponent={nextOpponent}
        onClaim={(player, tacId) => {
          const tac: TacticalCard | undefined = tacId
            ? reward.tacticalOffer.find((t) => t.id === tacId)
            : undefined
          claimReward(player, tac)
        }}
        onSwap={(takeId, exileId) => {
          const takeCard = reward.tacticalOffer.find((t) => t.id === takeId)
          if (takeCard) swapTacticalReward(takeCard, exileId)
          proceedToNextStage()
        }}
        onSetCaptain={setCaptain}
        onContinue={proceedToNextStage}
        onRemoveCard={removeDeckCard}
      />
    )
  }

  if (phase === 'runover' && runState) {
    return (
      <RunSummary
        runState={runState}
        onRestart={() => {
          handleRestart()
          startRun(runState.deck, runState.captainId)
        }}
        onHome={onHome}
      />
    )
  }

  if (viewState.error) {
    return (
      <div className="qp-error" role="alert">
        <p>{viewState.error}</p>
        <button type="button" onClick={onHome}>Back to Menu</button>
      </div>
    )
  }

  return (
    <div className="qp-loading">
      <p>Starting run…</p>
    </div>
  )
}
