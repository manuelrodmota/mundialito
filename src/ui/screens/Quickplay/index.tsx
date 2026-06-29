import { useState, useCallback } from 'react'
import type { Card } from '../../../engine/types'
import { laneFx } from '../../../engine'
import { useLang } from '../../i18n'
import { useQuickplayMatch } from '../../quickplay/useQuickplayMatch'
import { useFirstMatchOnboarding } from '../../onboarding/useFirstMatchOnboarding'
import { DeckBuilder } from '../DeckBuilder'
import { QuickplayChooser } from '../QuickplayChooser'
import { DifficultyPicker } from '../DifficultyPicker'
import { MatchBoard } from '../../organisms/MatchBoard'
import { ResultScreen } from '../ResultScreen'
import { fetchOwnedCounts } from '../../../data/user/userCards.repo'

type QuickplaySubScreen = 'chooser' | 'deckbuilder' | 'difficulty' | 'match' | 'result'

interface QuickplayProps {
  onBack: () => void
}

/** Quickplay container — orchestrates the full loop:
 *  deck builder → difficulty picker → match board → result → rematch.
 *  Owns the useQuickplayMatch hook and routes sub-screens.
 */
export function Quickplay({ onBack }: QuickplayProps) {
  const { t } = useLang()
  const [subScreen, setSubScreen] = useState<QuickplaySubScreen>('chooser')
  const [builtDeck, setBuiltDeck] = useState<Card[] | null>(null)
  const [captainId, setCaptainId] = useState<string | null>(null)
  // null = build from the full pool; a Set = build only from these owned card ids.
  const [ownedIds, setOwnedIds] = useState<Set<number> | null>(null)
  const [loadingOwned, setLoadingOwned] = useState(false)
  const onboarding = useFirstMatchOnboarding()

  const {
    viewState,
    difficulty,
    setDifficulty,
    start,
    commitTurn,
    reveal,
    nextRound,
    rematch,
  } = useQuickplayMatch()

  const handleDeckReady = useCallback((deck: Card[], capId: string) => {
    setBuiltDeck(deck)
    setCaptainId(capId)
    setSubScreen('difficulty')
  }, [])

  const handleBuildAll = useCallback(() => {
    setOwnedIds(null)
    setSubScreen('deckbuilder')
  }, [])

  const handleBuildOwned = useCallback(async () => {
    setLoadingOwned(true)
    try {
      const counts = await fetchOwnedCounts()
      setOwnedIds(new Set(counts.keys()))
    } catch {
      setOwnedIds(new Set())
    } finally {
      setLoadingOwned(false)
      setSubScreen('deckbuilder')
    }
  }, [])

  const handleKickOff = useCallback(async () => {
    if (!builtDeck || !captainId) return
    await start(builtDeck, captainId, difficulty)
    setSubScreen('match')
  }, [builtDeck, captainId, difficulty, start])

  // MatchBoard calls onCommit then onReveal separately — so onCommit ONLY stages the lineup.
  // (Calling reveal() here too would run it twice: the first resolves + clears the board, the
  //  second would snapshot the now-empty board → no cards on the pitch during the clash.)
  const handleCommit = useCallback(
    (opts: Parameters<typeof commitTurn>[0]) => {
      commitTurn(opts)
    },
    [commitTurn],
  )

  const handleNextRound = useCallback(() => {
    nextRound()
    if (viewState.roundReport?.decided || viewState.match?.winner !== null) {
      setSubScreen('result')
    }
  }, [nextRound, viewState.roundReport, viewState.match])

  const handleRematch = useCallback(async () => {
    await rematch()
    setSubScreen('match')
  }, [rematch])

  if (subScreen === 'chooser') {
    return (
      <QuickplayChooser
        onAll={handleBuildAll}
        onOwned={handleBuildOwned}
        onBack={onBack}
        loadingOwned={loadingOwned}
      />
    )
  }

  if (subScreen === 'deckbuilder') {
    return (
      <DeckBuilder
        onDeckReady={handleDeckReady}
        onBack={() => setSubScreen('chooser')}
        ownedCardIds={ownedIds ?? undefined}
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
        <MatchBoard
          match={viewState.match}
          onCommit={handleCommit}
          onReveal={reveal}
          onNextRound={handleNextRound}
          canCommit={viewState.canCommit}
          opponentIntent={viewState.opponentIntent}
          revealBoards={viewState.revealBoards}
          roundReport={viewState.roundReport}
          phase={viewState.phase === 'reveal' ? 'reveal' : 'playing'}
          laneFx={laneFx}
          onboarding={onboarding.active}
          onOnboardingDone={onboarding.dismiss}
          onSurrender={onBack}
          surrenderKind="match"
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

  if (viewState.phase === 'result' && viewState.match?.winner !== null && viewState.match) {
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
        <button type="button" onClick={onBack}>{t('screens.qpBackToMenu')}</button>
      </div>
    )
  }

  return (
    <div className="qp-loading">
      <p>{t('screens.qpStartingMatch')}</p>
    </div>
  )
}
