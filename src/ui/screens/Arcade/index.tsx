import { useCallback } from 'react'
import { laneFx } from '../../../engine'
import { useLang } from '../../i18n'
import { useArcadeRun } from '../../run/useArcadeRun'
import { useFirstMatchOnboarding } from '../../onboarding/useFirstMatchOnboarding'
import { DeckBuilder } from '../DeckBuilder'
import { RunMap } from '../RunMap'
import { LockerRoom } from '../LockerRoom'
import { RunSummary } from '../RunSummary'
import { MatchBoard } from '../../organisms/MatchBoard'
import type { Card, TacticalCard } from '../../../engine/types'

interface ArcadeProps {
  onHome: () => void
}

/** Arcade Run shell — calls useArcadeRun once and routes on its phase.
 *  Match wiring mirrors the Quickplay container exactly:
 *  GoalCelebration queue, commitTurn staging, reveal separation.
 */
export function Arcade({ onHome }: ArcadeProps) {
  const { t } = useLang()
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
    surrenderRun,
  } = useArcadeRun()

  const { phase, runState, matchSnapshot, reward, nextOpponent } = viewState
  const onboarding = useFirstMatchOnboarding()

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
          onboarding={onboarding.active}
          onOnboardingDone={onboarding.dismiss}
          onSurrender={surrenderRun}
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
        onRestart={() => startRun(runState.deck, runState.captainId)}
        onHome={onHome}
      />
    )
  }

  if (viewState.error) {
    return (
      <div className="qp-error" role="alert">
        <p>{viewState.error}</p>
        <button type="button" onClick={onHome}>{t('screens.arcadeBackToMenu')}</button>
      </div>
    )
  }

  return (
    <div className="qp-loading">
      <p>{t('screens.arcadeStartingRun')}</p>
    </div>
  )
}
