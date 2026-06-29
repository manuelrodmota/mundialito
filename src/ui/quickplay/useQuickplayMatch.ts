/**
 * Orchestrator hook — the sole file that imports engine runtime and Supabase repos.
 *
 * The live MatchState is mutated by the engine in place; a separate React state
 * snapshot (`matchSnapshot`) is updated after each engine call to trigger re-renders.
 * This avoids accessing refs during render, which React 19 flags as an error.
 *
 * Two-step round flow:
 *   1. Player commits their lineup (commitTurn)
 *   2. reveal() — snapshots boards, resolves, builds roundReport, phase → 'reveal'
 *   3. nextRound() — if winner → 'result'; else startRound + decideTurn, phase → 'playing'
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { newMatch, startRound, resolveRound, decideTurn, intentOf, makeRng, computeEffectiveStats, computeSynergies, FORMATIONS, FATIGUE_DIV, HALFTIME_ROUND, CARD_CAP, TACTICALS_PER_HALF, MERCY_LEAD, ROUND_CAP, laneStamina, laneStack, atkOf, defOf, laneMultiplier, cardLaneMult, tacticalGatePassed } from '../../engine'
import type { MatchState, Card, Formation, Tier, CardInPlay, PlayerCard, PlayerState, ShotResult } from '../../engine/types'
import type { Intent } from '../../engine/board'
import type { Rng } from '../../engine/rng'
import { pickOpponentByDifficulty } from '../../data/remote/opponents.repo'
import { buildQuickplayDeck } from './buildQuickplayDeck'
import { buildOpponentBench } from '../../data/opponentBench'
import type { TacticalCard } from '../../engine/types'
import { getSupabaseClient } from '../../data/remote/client'
import { recordMatch } from '../../data/user/profile.repo'
import { useAccount } from '../../account/AccountProvider'
import { quickplayMatchXp } from '../../meta/xpSources'
import { opponents as staticOpponents } from '../../data/opponents'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'legendary'

export interface RevealBoards {
  you: { attack: CardInPlay[]; defense: CardInPlay[] }
  them: { attack: CardInPlay[]; defense: CardInPlay[] }
}

/** Per-side breakdown for the round report — all derived from the pre-resolve player state. */
export interface SideReport {
  atkEff: number
  defEff: number
  formation: Formation
  atkMult: number
  defMult: number
  fatigue: number
  fatigueDefMult: number
  /** Extra ATK+DEF contributed by rarity multipliers above common (the "star quality"). */
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

/** Derived view-state exposed to presentational components. */
export interface QuickplayViewState {
  match: MatchState | null
  phase: 'idle' | 'loading' | 'playing' | 'reveal' | 'result'
  error: string | null
  goalEvents: GoalEvent[]
  canCommit: boolean
  opponentIntent: Intent | null
  revealBoards: RevealBoards | null
  roundReport: RoundReport | null
}

export interface GoalEvent {
  id: string
  scorer: string
  isYou: boolean
  /** Scoreline AFTER this goal, [you, them]. */
  score: readonly [number, number]
}

/** Builds the per-side report breakdown from a player's pre-resolve committed state. */
function buildSideReport(p: PlayerState, xg: number, scored: boolean): SideReport {
  const eff = computeEffectiveStats(p)
  const syn = computeSynergies([...p.board.attack, ...p.board.defense], p.captainId)
  const fm = FORMATIONS[p.formation]
  // v11 "star quality" = the lift the lane force-multiplier adds over the base lane stack (only
  // active when a lane has ≥2 cards), summed across both lanes.
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

const DIFFICULTY_TO_TIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  legendary: 5,
}

function difficultyToTier(d: Difficulty): Tier {
  const tiers: Tier[] = ['D', 'C', 'B', 'A', 'S']
  const idx = Math.min(DIFFICULTY_TO_TIER[d] - 1, tiers.length - 1)
  return tiers[idx] ?? 'D'
}

export interface UseQuickplayMatchReturn {
  viewState: QuickplayViewState
  difficulty: Difficulty
  setDifficulty: (d: Difficulty) => void
  start: (deck: Card[], captainId: string, difficulty: Difficulty, seed?: number) => Promise<void>
  commitTurn: (opts: CommitTurnOptions) => void
  reveal: () => void
  nextRound: () => void
  /** @deprecated Use reveal() + nextRound() instead. Kept for legacy callers. */
  resolveCurrentRound: () => void
  rematch: () => Promise<void>
}

export interface CommitTurnOptions {
  formation: Formation
  attackCards: PlayerCard[]
  defenseCards: PlayerCard[]
  tacticals?: TacticalCard[]
}

interface MatchSession {
  deck: Card[]
  captainId: string
  difficulty: Difficulty
  seed: number
}

function roundToMinute(round: number, extraTime: boolean): string {
  if (extraTime) return `90+${(round - ROUND_CAP) * 9}'`
  return `${round * 9}'`
}

function computePhase(round: number, extraTime: boolean): string {
  if (extraTime) return 'EXTRA TIME'
  if (round <= 5) return '1ST HALF'
  return '2ND HALF'
}

export function useQuickplayMatch(): UseQuickplayMatchReturn {
  const matchRef = useRef<MatchState | null>(null)
  const rngRef = useRef<Rng | null>(null)
  const sessionRef = useRef<MatchSession | null>(null)
  const goalCounterRef = useRef(0)
  const recordedRef = useRef(false)

  const { addXp } = useAccount()

  const [matchSnapshot, setMatchSnapshot] = useState<MatchState | null>(null)

  // Record a finished match once (player is index 0) + grant XP. Best-effort; no-op when signed out.
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
    void addXp(quickplayMatchXp(won))
  }, [matchSnapshot?.winner, addXp])
  const [phase, setPhase] = useState<QuickplayViewState['phase']>('idle')
  const [error, setError] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [goalEvents, setGoalEvents] = useState<GoalEvent[]>([])
  const [opponentIntent, setOpponentIntent] = useState<Intent | null>(null)
  const [revealBoardsState, setRevealBoardsState] = useState<RevealBoards | null>(null)
  const [roundReport, setRoundReport] = useState<RoundReport | null>(null)

  const syncSnapshot = useCallback(() => {
    const m = matchRef.current
    setMatchSnapshot(m ? { ...m, players: [...m.players] as [typeof m.players[0], typeof m.players[1]] } : null)
  }, [])

  const refreshIntent = useCallback(() => {
    const m = matchRef.current
    if (!m) {
      setOpponentIntent(null)
      return
    }
    setOpponentIntent(intentOf(m.players[1]!))
  }, [])

  const start = useCallback(async (
    deck: Card[],
    captainId: string,
    chosenDifficulty: Difficulty,
    seed?: number,
  ) => {
    setPhase('loading')
    setError(null)
    setGoalEvents([])
    setMatchSnapshot(null)
    setOpponentIntent(null)
    setRevealBoardsState(null)
    setRoundReport(null)

    const resolvedSeed = seed ?? Math.floor(Date.now() % 2 ** 32)
    const rng = makeRng(resolvedSeed)
    rngRef.current = rng

    sessionRef.current = {
      deck,
      captainId,
      difficulty: chosenDifficulty,
      seed: resolvedSeed,
    }

    try {
      const difficultyNumber = DIFFICULTY_TO_TIER[chosenDifficulty]
      const client = getSupabaseClient()
      let opponent = await pickOpponentByDifficulty(difficultyNumber, rng.next, 'en', client)

      if (!opponent) {
        const fallbackDifficulties = [1, 2, 3]
        for (const fallback of fallbackDifficulties) {
          opponent = await pickOpponentByDifficulty(fallback, rng.next, 'en', client)
          if (opponent) break
        }
      }

      if (!opponent) {
        const tier = difficultyToTier(chosenDifficulty)
        const tierOpponents = staticOpponents.filter((o) => o.tier === tier)
        const fallbackPool = tierOpponents.length > 0 ? tierOpponents : staticOpponents
        const idx = Math.floor(rng.next() * fallbackPool.length)
        opponent = fallbackPool[idx] ?? fallbackPool[0]
      }

      if (!opponent) {
        throw new Error('No opponent available for the selected difficulty')
      }

      const playerCount = (o: typeof opponent) =>
        o?.squad?.filter((c) => c.type === 'player').length ?? 0
      if (playerCount(opponent) < 5) {
        const sameTier = staticOpponents.filter((o) => o.tier === opponent!.tier)
        const fbPool = sameTier.length > 0 ? sameTier : staticOpponents
        opponent = fbPool[Math.floor(rng.next() * fbPool.length)] ?? fbPool[0] ?? opponent
      }

      const oppPlayers = opponent.squad.filter((c) => c.type === 'player') as PlayerCard[]
      const oppPremiums: PlayerCard[] = []
      let oppSlots = 0
      for (const c of oppPlayers.filter((c) => c.rarity !== 'common')) {
        if (oppPremiums.length >= 10 || oppSlots + c.slots > 20) continue
        oppPremiums.push(c)
        oppSlots += c.slots
      }
      const oppCaptain = oppPremiums[0] ?? oppPlayers[0]

      const opponentDeck = buildQuickplayDeck({
        premiumPicks: oppPremiums,
        tacticalPicks: opponent.signatureTactical ?? [],
        captainId: oppCaptain?.id ?? '',
        commonPool: buildOpponentBench(opponent),
        rosterSize: 16,
        playerBudget: 20,
        tacticalCap: 3,
        rng,
      })

      const match = newMatch(
        resolvedSeed,
        { deck, captainId },
        { deck: opponentDeck.deck, captainId: opponentDeck.captainId },
        opponent,
        'quickplay',
      )

      startRound(match, rng)
      matchRef.current = match

      decideTurn(match, 1, rng)
      refreshIntent()

      setPhase('playing')
      setDifficulty(chosenDifficulty)
      syncSnapshot()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setPhase('idle')
    }
  }, [syncSnapshot, refreshIntent])

  const commitTurn = useCallback((opts: CommitTurnOptions) => {
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
      // Enforce the positional gate against the committed lineup (e.g. Long Ball needs ≥1 FWD up
      // front). The attack/defense players were pushed above, so the board is complete here. This
      // mirrors the AI's pickTacticals gate and is the backstop for the UI's play-time check.
      if (!tacticalGatePassed(p0, tac.effect)) continue
      const handIdx = p0.hand.findIndex((c) => c.id === tac.id)
      if (handIdx === -1) continue
      const [removed] = p0.hand.splice(handIdx, 1)
      if (removed) {
        const tcard = removed as TacticalCard
        if (tcard.category === 'power') {
          // Powers stay active all match — route straight to the persistent powers shelf, never
          // onto the pitch (so they're active from the round played and don't occupy a lane slot).
          p0.powers.push(tcard)
        } else {
          const cip: CardInPlay = { card: removed, lane: 'attack', statuses: [], faceDown: false }
          p0.board.attack.push(cip)
        }
        p0.tacticalsThisHalf += 1
      }
    }

    syncSnapshot()
  }, [syncSnapshot])

  const reveal = useCallback(() => {
    const match = matchRef.current
    const rng = rngRef.current
    if (!match || !rng || match.winner !== null) return

    const p0 = match.players[0]!
    const p1 = match.players[1]!

    const boards: RevealBoards = {
      you: {
        attack: [...p0.board.attack],
        defense: [...p0.board.defense],
      },
      them: {
        attack: [...p1.board.attack],
        defense: [...p1.board.defense],
      },
    }

    const beforeYouGoals = p0.goals
    const beforeThemGoals = p1.goals
    // Pressure at the start of the round — the reveal animates each bar from here, one side at a
    // time, so you never see the opponent's outcome before their goal/save beat plays.
    const beforeYouXg = Math.min(1, p0.xg)
    const beforeThemXg = Math.min(1, p1.xg)
    const currentRound = match.round

    // Side reports must be built from the PRE-resolve state (resolveRound clears the boards).
    const youPre = buildSideReport(p0, 0, false)
    const themPre = buildSideReport(p1, 0, false)

    resolveRound(match, rng)

    const youGoalsThisRound = p0.goals - beforeYouGoals
    const themGoalsThisRound = p1.goals - beforeThemGoals
    // v11: the report shows the CHANCE built this round (the fill the engine added to the meter),
    // not a carry-back — scoring is now a separate shot roll. p?.lastFill is set by resolveRound.
    const youXgGained = p0.lastFill ?? 0
    const themXgGained = p1.lastFill ?? 0

    // Running scoreline so each GOAL celebration shows the score after it lands.
    let you = beforeYouGoals
    let them = beforeThemGoals
    const newGoalEvents: GoalEvent[] = []
    for (let i = 0; i < youGoalsThisRound; i++) {
      goalCounterRef.current += 1
      you += 1
      newGoalEvents.push({ id: `goal-you-${goalCounterRef.current}`, scorer: 'YOU', isYou: true, score: [you, them] })
    }
    for (let i = 0; i < themGoalsThisRound; i++) {
      goalCounterRef.current += 1
      them += 1
      newGoalEvents.push({ id: `goal-them-${goalCounterRef.current}`, scorer: match.opponent.name, isYou: false, score: [you, them] })
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
    setPhase('reveal')
    syncSnapshot()
  }, [syncSnapshot])

  const nextRound = useCallback(() => {
    const match = matchRef.current
    const rng = rngRef.current
    if (!match || !rng) return

    setRevealBoardsState(null)
    setRoundReport(null)

    if (match.winner !== null) {
      setPhase('result')
      syncSnapshot()
      return
    }

    startRound(match, rng)
    decideTurn(match, 1, rng)
    refreshIntent()

    setPhase('playing')
    syncSnapshot()
  }, [syncSnapshot, refreshIntent])

  const resolveCurrentRound = useCallback(() => {
    const match = matchRef.current
    const rng = rngRef.current
    if (!match || !rng || match.winner !== null) return

    const goalsBefore0 = match.players[0]!.goals
    const goalsBefore1 = match.players[1]!.goals

    decideTurn(match, 1, rng)
    resolveRound(match, rng)

    const goals0After = match.players[0]!.goals
    const goals1After = match.players[1]!.goals

    const newEvents: GoalEvent[] = []
    let you = goalsBefore0
    let them = goalsBefore1

    if (goals0After > goalsBefore0) {
      for (let i = 0; i < goals0After - goalsBefore0; i++) {
        goalCounterRef.current += 1
        you += 1
        newEvents.push({ id: `goal-you-${goalCounterRef.current}`, scorer: 'YOU', isYou: true, score: [you, them] })
      }
    }

    if (goals1After > goalsBefore1) {
      for (let i = 0; i < goals1After - goalsBefore1; i++) {
        goalCounterRef.current += 1
        them += 1
        newEvents.push({ id: `goal-them-${goalCounterRef.current}`, scorer: match.opponent.name, isYou: false, score: [you, them] })
      }
    }

    if (newEvents.length > 0) {
      setGoalEvents((prev) => [...prev, ...newEvents])
    }

    if (match.winner !== null) {
      setPhase('result')
    } else {
      startRound(match, rng)
      decideTurn(match, 1, rng)
      refreshIntent()
    }

    syncSnapshot()
  }, [syncSnapshot, refreshIntent])

  const rematch = useCallback(async () => {
    const session = sessionRef.current
    if (!session) return
    setGoalEvents([])
    setOpponentIntent(null)
    setRevealBoardsState(null)
    setRoundReport(null)
    await start(session.deck, session.captainId, session.difficulty, session.seed + 1)
  }, [start])

  const canCommit =
    matchSnapshot !== null &&
    matchSnapshot.winner === null &&
    matchSnapshot.phase === 'plan' &&
    phase === 'playing'

  return {
    viewState: {
      match: matchSnapshot,
      phase,
      error,
      goalEvents,
      canCommit,
      opponentIntent,
      revealBoards: revealBoardsState,
      roundReport,
    },
    difficulty,
    setDifficulty,
    start,
    commitTurn,
    reveal,
    nextRound,
    resolveCurrentRound,
    rematch,
  }
}

export { roundToMinute, computePhase, DIFFICULTY_TO_TIER, difficultyToTier, CARD_CAP, TACTICALS_PER_HALF, MERCY_LEAD, laneStamina, tacticalGatePassed, cardLaneMult }
