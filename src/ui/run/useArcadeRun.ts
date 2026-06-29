/**
 * Orchestrator hook for the Arcade Run mode — the sole island in `src/ui/run/`
 * that imports engine runtime + run logic.
 *
 * Mirrors `useQuickplayMatch` exactly:
 *   - The live `MatchState` is held in a `useRef` (mutated in place by the engine)
 *     and published as a shallow-cloned `useState` snapshot after each engine call.
 *   - A single seeded `Rng` is threaded for the entire run for reproducibility.
 *   - Two-step round flow: `commitTurn` → `reveal()` → `nextRound()`.
 *
 * Phase transitions:
 *   'building'  — pre-run, waiting for `startRun`
 *   'map'       — between matches, RunMap is shown
 *   'match'     — active match in progress
 *   'locker'    — post-win reward/management screen
 *   'runover'   — run ended (win or loss)
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import {
  newMatch,
  startRound,
  resolveRound,
  decideTurn,
  intentOf,
  makeRng,
  computeEffectiveStats,
  computeSynergies,
  laneStack,
  atkOf,
  defOf,
  laneMultiplier,
  FORMATIONS,
  FATIGUE_DIV,
  HALFTIME_ROUND,
  ROUND_CAP,
  RUN_TACTICAL_DECK_CAP,
  tacticalGatePassed,
} from '../../engine'
import { buildQuickplayDeck } from '../quickplay/buildQuickplayDeck'
import type { MatchState, Card, Formation, CardInPlay, PlayerCard, PlayerState, TacticalCard, OpponentTeam, ShotResult } from '../../engine/types'
import type { Intent } from '../../engine/board'
import type { Rng } from '../../engine/rng'
import type { RunState } from '../../engine/types'
import { newRun, stageForIndex, advanceRun, isRunOver, isRunWon, runEndReward, aiStrengthMultFor } from '../../run'
import { drawOpponent, allowedTiersForStage } from '../../run'
import { rollPlayerReward, offerTacticals, applyReward, swapTactical, removeCard, countTacticals } from '../../run'
import { players as staticPlayerPool } from '../../data/players'
import { buildOpponentBench } from '../../data/opponentBench'
import { tacticals as allTacticals } from '../../data/tacticals'
import { recordMatch } from '../../data/user/profile.repo'
import { addBoxes, type UnopenedBox } from '../../data/user/userBoxes.repo'
import { useAccount } from '../../account/AccountProvider'
import { arcadeMatchXp } from '../../meta/xpSources'

export type ArcadeRunPhase = 'building' | 'map' | 'match' | 'locker' | 'runover'

export interface RevealBoards {
  you: { attack: CardInPlay[]; defense: CardInPlay[] }
  them: { attack: CardInPlay[]; defense: CardInPlay[] }
}

export interface SideReport {
  atkEff: number
  defEff: number
  formation: Formation
  atkMult: number
  defMult: number
  fatigue: number
  fatigueDefMult: number
  rarityBonus: number
  synAtk: number
  synDef: number
  scored: boolean
  /** xG (pressure) this side BUILT this round — the chance created. */
  xg: number
  /** v11 finishing: this round's shot outcome (took/scored/conversion P). */
  shot?: ShotResult
  /** Meter pressure [0,1] at the START of the round (before this round's fill). */
  pressureBefore: number
  /** Meter pressure [0,1] AFTER the shot resolved (0 on a goal, dropped on a miss). */
  pressureAfter: number
}

export interface RoundReport {
  round: number
  extraTime: boolean
  halftime: boolean
  youXg: number
  themXg: number
  youGoalsThisRound: number
  themGoalsThisRound: number
  youGoalsTotal: number
  themGoalsTotal: number
  decided: boolean
  you: SideReport
  them: SideReport
}

export interface GoalEvent {
  id: string
  scorer: string
  isYou: boolean
  score: readonly [number, number]
}

export interface CommitTurnOptions {
  formation: Formation
  attackCards: PlayerCard[]
  defenseCards: PlayerCard[]
  tacticals?: TacticalCard[]
}

export interface RewardState {
  player: PlayerCard | null
  tacticalOffer: TacticalCard[]
  atCap: boolean
}

export interface ArcadeRunViewState {
  runState: RunState | null
  matchSnapshot: MatchState | null
  phase: ArcadeRunPhase
  error: string | null
  goalEvents: GoalEvent[]
  canCommit: boolean
  opponentIntent: Intent | null
  revealBoards: RevealBoards | null
  roundReport: RoundReport | null
  reward: RewardState | null
  nextOpponent: OpponentTeam | null
  /** Run-end reward boxes granted to the locker (shown on the summary). */
  rewardBoxes: UnopenedBox[]
}

export interface UseArcadeRunReturn {
  viewState: ArcadeRunViewState
  startRun: (deck: Card[], captainId: string, seed?: number) => void
  startStage: () => void
  commitTurn: (opts: CommitTurnOptions) => void
  reveal: () => void
  nextRound: () => void
  claimReward: (player: PlayerCard, tactical?: TacticalCard) => void
  swapTacticalReward: (takeCard: TacticalCard, exileId: string) => void
  declineReward: () => void
  setCaptain: (id: string) => void
  removeDeckCard: (id: string) => void
  proceedToNextStage: () => void
  /** Abandon the active run mid-match and return to squad selection (the deck builder). */
  surrenderRun: () => void
}

function buildSideReport(p: PlayerState, xg: number, scored: boolean): SideReport {
  const eff = computeEffectiveStats(p)
  const syn = computeSynergies([...p.board.attack, ...p.board.defense], p.captainId)
  const fm = FORMATIONS[p.formation]
  // v11 "star quality" = the lift the lane force-multiplier adds over the base lane stack.
  const atkBase = laneStack(p.board.attack.map((c) => atkOf(c, false)))
  const defBase = laneStack(p.board.defense.map((c) => defOf(c, false)))
  const rarityBonus =
    atkBase * (laneMultiplier(p.board.attack) - 1) + defBase * (laneMultiplier(p.board.defense) - 1)
  return {
    atkEff: Math.round(eff.atkEff),
    defEff: Math.round(eff.defEff),
    formation: p.formation,
    atkMult: fm.atkMult,
    defMult: fm.defMult,
    fatigue: p.fatigue,
    fatigueDefMult: 1 - p.fatigue / FATIGUE_DIV,
    rarityBonus: Math.round(rarityBonus),
    synAtk: Math.round(syn.atk),
    synDef: Math.round(syn.def),
    scored,
    xg,
    // Overridden in the round-report assembly with the real pre/post-round pressure.
    pressureBefore: 0,
    pressureAfter: 0,
  }
}

export function useArcadeRun(initialSeed?: number): UseArcadeRunReturn {
  const matchRef = useRef<MatchState | null>(null)
  const rngRef = useRef<Rng | null>(null)
  const goalCounterRef = useRef(0)
  const recordedRef = useRef(false)

  const { addXp } = useAccount()

  const [runState, setRunState] = useState<RunState | null>(null)
  const [matchSnapshot, setMatchSnapshot] = useState<MatchState | null>(null)

  // Record each finished match once (player is index 0) + grant XP (participation + win +
  // stage-clear, plus the run-win bonus on a Final win). Best-effort; no-op when signed out.
  useEffect(() => {
    const w = matchSnapshot?.winner
    if (w === null || w === undefined) {
      recordedRef.current = false
      return
    }
    if (recordedRef.current) return
    recordedRef.current = true
    const won = w === 0
    void recordMatch(won)
    const stage = runState?.stage ?? 'group'
    void addXp(arcadeMatchXp(won, stage, won && stage === 'final'))
  }, [matchSnapshot?.winner, runState, addXp])
  const [phase, setPhase] = useState<ArcadeRunPhase>('building')
  const [error, setError] = useState<string | null>(null)
  const [goalEvents, setGoalEvents] = useState<GoalEvent[]>([])
  const [opponentIntent, setOpponentIntent] = useState<Intent | null>(null)
  const [revealBoardsState, setRevealBoardsState] = useState<RevealBoards | null>(null)
  const [roundReport, setRoundReport] = useState<RoundReport | null>(null)
  const [reward, setReward] = useState<RewardState | null>(null)
  const [nextOpponentState, setNextOpponentState] = useState<OpponentTeam | null>(null)
  const [rewardBoxes, setRewardBoxes] = useState<UnopenedBox[]>([])
  const rewardGrantedRef = useRef(false)

  // On run end, grant the §8 reward boxes to the locker once. Best-effort; no-op when signed out.
  // (The guard + rewardBoxes are reset in startRun, not here, to avoid sync setState in an effect.)
  useEffect(() => {
    if (phase !== 'runover' || !runState) return
    if (rewardGrantedRef.current) return
    rewardGrantedRef.current = true
    addBoxes(runEndReward(runState), 'run')
      .then(setRewardBoxes)
      .catch(() => setRewardBoxes([]))
  }, [phase, runState])

  const syncSnapshot = useCallback(() => {
    const m = matchRef.current
    setMatchSnapshot(
      m
        ? { ...m, players: [...m.players] as [typeof m.players[0], typeof m.players[1]] }
        : null,
    )
  }, [])

  const refreshIntent = useCallback(() => {
    const m = matchRef.current
    if (!m) {
      setOpponentIntent(null)
      return
    }
    setOpponentIntent(intentOf(m.players[1]!))
  }, [])

  const startRun = useCallback(
    (deck: Card[], captainId: string, seed?: number) => {
      const resolvedSeed = seed ?? initialSeed ?? Math.floor(Date.now() % 2 ** 32)
      const rng = makeRng(resolvedSeed)
      rngRef.current = rng

      const run = newRun(deck, captainId)
      rewardGrantedRef.current = false
      setRewardBoxes([])
      setRunState(run)
      setPhase('map')
      setError(null)
      setGoalEvents([])
      setMatchSnapshot(null)
      setOpponentIntent(null)
      setRevealBoardsState(null)
      setRoundReport(null)
      setReward(null)
      matchRef.current = null
      goalCounterRef.current = 0

      try {
        const firstOpponent = drawOpponent(run.stage, run.defeated, rng)
        setNextOpponentState(firstOpponent)
      } catch {
        setNextOpponentState(null)
      }
    },
    [initialSeed],
  )

  const startStage = useCallback(() => {
    const run = runState
    const rng = rngRef.current
    const opponent = nextOpponentState
    if (!run || !rng || !opponent || isRunOver(run)) return

    setError(null)
    setGoalEvents([])
    setRevealBoardsState(null)
    setRoundReport(null)
    setNextOpponentState(null)

    try {
      const oppPremiums: PlayerCard[] = []
      let oppSlots = 0
      for (const c of opponent.squad.filter((p) => p.rarity !== 'common')) {
        if (oppPremiums.length >= 10 || oppSlots + c.slots > 20) continue
        oppPremiums.push(c)
        oppSlots += c.slots
      }
      const oppCaptain = oppPremiums[0] ?? opponent.squad[0]

      const stageSeed = Math.floor(rng.next() * 2 ** 32)

      // Build the opponent a real deck (like Quickplay): premiums + a bench of cycling commons +
      // its signature tacticals. The raw squad alone is mostly premiums that lock once-per-half —
      // that starved the AI to ~1 fieldable card a round — and it carried no tacticals at all,
      // so the opponent never played any. The common bench keeps a full lineup every round, and
      // buildOpponentBench sources it from the opponent's *own* nation (no foreign fill).
      const opponentDeck = buildQuickplayDeck({
        premiumPicks: oppPremiums,
        tacticalPicks: (opponent.signatureTactical ?? []).slice(0, 3),
        captainId: oppCaptain?.id ?? '',
        commonPool: buildOpponentBench(opponent),
        rosterSize: 16,
        playerBudget: 20,
        tacticalCap: 3,
        rng,
      })

      const match = newMatch(
        stageSeed,
        { deck: run.deck, captainId: run.captainId },
        { deck: opponentDeck.deck, captainId: opponentDeck.captainId },
        opponent,
        'run',
      )
      // Per-stage difficulty handicap + v12 champion strength-floor (a weak champion drawn for the
      // Final is normalized up so the Final is reliably the hardest stage). Tuned via scripts/arcadeSim.ts.
      match.aiStrengthMult = aiStrengthMultFor(run.stage, opponent)

      startRound(match, rng)
      matchRef.current = match

      decideTurn(match, 1, rng)
      refreshIntent()

      setPhase('match')
      syncSnapshot()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    }
  }, [runState, nextOpponentState, refreshIntent, syncSnapshot])

  const commitTurn = useCallback(
    (opts: CommitTurnOptions) => {
      const match = matchRef.current
      const rng = rngRef.current
      if (!match || !rng || match.winner !== null) return

      const p0 = match.players[0]!
      p0.formation = opts.formation
      p0.board.attack = []
      p0.board.defense = []

      for (const card of opts.attackCards) {
        const handIdx = p0.hand.findIndex((c) => c.id === card.id)
        if (handIdx === -1) continue
        const [removed] = p0.hand.splice(handIdx, 1)
        if (removed) {
          const cip: CardInPlay = { card: removed, lane: 'attack', statuses: [], faceDown: true }
          p0.board.attack.push(cip)
        }
      }

      for (const card of opts.defenseCards) {
        const handIdx = p0.hand.findIndex((c) => c.id === card.id)
        if (handIdx === -1) continue
        const [removed] = p0.hand.splice(handIdx, 1)
        if (removed) {
          const cip: CardInPlay = { card: removed, lane: 'defense', statuses: [], faceDown: true }
          p0.board.defense.push(cip)
        }
      }

      for (const tac of opts.tacticals ?? []) {
        // Enforce the positional gate against the committed lineup (e.g. Long Ball needs ≥1 FWD).
        if (!tacticalGatePassed(p0, tac.effect)) continue
        const handIdx = p0.hand.findIndex((c) => c.id === tac.id)
        if (handIdx === -1) continue
        const [removed] = p0.hand.splice(handIdx, 1)
        if (removed) {
          const tcard = removed as TacticalCard
          if (tcard.category === 'power') {
            // Powers stay active all match — route to the persistent powers shelf, not the pitch.
            p0.powers.push(tcard)
          } else {
            const cip: CardInPlay = { card: removed, lane: 'attack', statuses: [], faceDown: false }
            p0.board.attack.push(cip)
          }
          p0.tacticalsThisHalf += 1
        }
      }

      syncSnapshot()
    },
    [syncSnapshot],
  )

  const reveal = useCallback(() => {
    const match = matchRef.current
    const rng = rngRef.current
    if (!match || !rng || match.winner !== null) return

    const p0 = match.players[0]!
    const p1 = match.players[1]!

    const boards: RevealBoards = {
      you: { attack: [...p0.board.attack], defense: [...p0.board.defense] },
      them: { attack: [...p1.board.attack], defense: [...p1.board.defense] },
    }

    const beforeYouGoals = p0.goals
    const beforeThemGoals = p1.goals
    // Pre-round pressure — the reveal animates each bar from here, one side at a time.
    const beforeYouXg = Math.min(1, p0.xg)
    const beforeThemXg = Math.min(1, p1.xg)
    const currentRound = match.round

    const youPre = buildSideReport(p0, 0, false)
    const themPre = buildSideReport(p1, 0, false)

    resolveRound(match, rng)

    const youGoalsThisRound = p0.goals - beforeYouGoals
    const themGoalsThisRound = p1.goals - beforeThemGoals
    // v11: report the CHANCE built this round (the engine's fill add), not a carry-back — finishing
    // is now a separate shot roll. p?.lastFill is set by resolveRound.
    const youXgGained = p0.lastFill ?? 0
    const themXgGained = p1.lastFill ?? 0

    let you = beforeYouGoals
    let them = beforeThemGoals
    const newGoalEvents: GoalEvent[] = []
    for (let i = 0; i < youGoalsThisRound; i++) {
      goalCounterRef.current += 1
      you += 1
      newGoalEvents.push({
        id: `goal-you-${goalCounterRef.current}`,
        scorer: 'YOU',
        isYou: true,
        score: [you, them],
      })
    }
    for (let i = 0; i < themGoalsThisRound; i++) {
      goalCounterRef.current += 1
      them += 1
      newGoalEvents.push({
        id: `goal-them-${goalCounterRef.current}`,
        scorer: match.opponent.name,
        isYou: false,
        score: [you, them],
      })
    }
    if (newGoalEvents.length > 0) {
      setGoalEvents((prev) => [...prev, ...newGoalEvents])
    }

    setRevealBoardsState(boards)
    setRoundReport({
      round: currentRound,
      extraTime: match.extraTime,
      halftime: currentRound === HALFTIME_ROUND,
      youXg: youXgGained,
      themXg: themXgGained,
      youGoalsThisRound,
      themGoalsThisRound,
      youGoalsTotal: p0.goals,
      themGoalsTotal: p1.goals,
      decided: match.winner !== null,
      you: { ...youPre, xg: youXgGained, scored: youGoalsThisRound > 0, shot: p0.lastShot, pressureBefore: beforeYouXg, pressureAfter: Math.min(1, p0.xg) },
      them: { ...themPre, xg: themXgGained, scored: themGoalsThisRound > 0, shot: p1.lastShot, pressureBefore: beforeThemXg, pressureAfter: Math.min(1, p1.xg) },
    })
    syncSnapshot()
  }, [syncSnapshot])

  const openRewardPhase = useCallback(
    (updatedRun: RunState, prevStage: RunState['stage'], rng: Rng) => {
      const premiumPool = staticPlayerPool.filter((p) => p.rarity !== 'common')
      const playerPool = premiumPool.length > 0 ? premiumPool : staticPlayerPool
      const rewardPlayer = rollPlayerReward(prevStage, playerPool, rng)

      const heldTacIds = new Set(
        updatedRun.deck.filter((c) => c.type === 'tactical').map((c) => c.id),
      )
      const eligibleTacs = allTacticals.filter((t) => !heldTacIds.has(t.id))
      const offerPool = eligibleTacs.length >= 3 ? eligibleTacs : allTacticals
      const offer = offerTacticals(offerPool, rng)

      setReward({
        player: rewardPlayer,
        tacticalOffer: offer,
        atCap: countTacticals(updatedRun.deck) >= RUN_TACTICAL_DECK_CAP,
      })
      setPhase('locker')
    },
    [],
  )

  const onMatchResolved = useCallback(
    (match: MatchState, run: RunState, rng: Rng) => {
      const won = match.winner === 0

      const updatedRun = advanceRun(run, won, match.opponent.id)
      setRunState(updatedRun)

      if (!won) {
        setPhase('runover')
        return
      }

      if (isRunWon(updatedRun)) {
        setPhase('runover')
        return
      }

      openRewardPhase(updatedRun, run.stage, rng)
    },
    [openRewardPhase],
  )

  const nextRound = useCallback(() => {
    const match = matchRef.current
    const rng = rngRef.current
    const run = runState
    if (!match || !rng || !run) return

    setRevealBoardsState(null)
    setRoundReport(null)

    if (match.winner !== null) {
      onMatchResolved(match, run, rng)
      syncSnapshot()
      return
    }

    startRound(match, rng)
    decideTurn(match, 1, rng)
    refreshIntent()
    syncSnapshot()
  }, [runState, onMatchResolved, refreshIntent, syncSnapshot])

  const claimReward = useCallback(
    (player: PlayerCard, tactical?: TacticalCard) => {
      const run = runState
      const rng = rngRef.current
      if (!run || !rng) return

      const updated = applyReward(run, player, tactical)
      setRunState(updated)
      setReward(null)
      setPhase('map')

      try {
        const nextOpp = drawOpponent(updated.stage, updated.defeated, rng)
        setNextOpponentState(nextOpp)
      } catch {
        setNextOpponentState(null)
      }
    },
    [runState],
  )

  const swapTacticalReward = useCallback(
    (takeCard: TacticalCard, exileId: string) => {
      const run = runState
      if (!run) return

      const updated = swapTactical(run, takeCard, exileId)
      setRunState(updated)
    },
    [runState],
  )

  const declineReward = useCallback(() => {
    setReward((prev) => (prev ? { ...prev, tacticalOffer: [] } : null))
  }, [])

  const setCaptain = useCallback((id: string) => {
    setRunState((prev) => (prev ? { ...prev, captainId: id } : null))
  }, [])

  const removeDeckCard = useCallback(
    (id: string) => {
      const run = runState
      if (!run) return
      const updated = removeCard(run, id)
      setRunState(updated)
    },
    [runState],
  )

  const proceedToNextStage = useCallback(() => {
    const run = runState
    const rng = rngRef.current
    setReward(null)
    setPhase('map')

    if (run && rng) {
      try {
        const nextOpp = drawOpponent(run.stage, run.defeated, rng)
        setNextOpponentState(nextOpp)
      } catch {
        setNextOpponentState(null)
      }
    }
  }, [runState])

  const surrenderRun = useCallback(() => {
    matchRef.current = null
    goalCounterRef.current = 0
    setRunState(null)
    setMatchSnapshot(null)
    setPhase('building')
    setError(null)
    setGoalEvents([])
    setOpponentIntent(null)
    setRevealBoardsState(null)
    setRoundReport(null)
    setReward(null)
    setNextOpponentState(null)
  }, [])

  const canCommit =
    matchSnapshot !== null &&
    matchSnapshot.winner === null &&
    matchSnapshot.phase === 'plan' &&
    phase === 'match'

  return {
    viewState: {
      runState,
      matchSnapshot,
      phase,
      error,
      goalEvents,
      canCommit,
      opponentIntent,
      revealBoards: revealBoardsState,
      roundReport,
      reward,
      nextOpponent: nextOpponentState,
      rewardBoxes,
    },
    startRun,
    startStage,
    commitTurn,
    reveal,
    nextRound,
    claimReward,
    swapTacticalReward,
    declineReward,
    setCaptain,
    removeDeckCard,
    proceedToNextStage,
    surrenderRun,
  }
}

export { stageForIndex, isRunOver, isRunWon, allowedTiersForStage, ROUND_CAP }
