/**
 * Orchestrator hook — the sole file that imports engine runtime and Supabase repos.
 *
 * The live MatchState is mutated by the engine in place; a separate React state
 * snapshot (`matchSnapshot`) is updated after each engine call to trigger re-renders.
 * This avoids accessing refs during render, which React 19 flags as an error.
 */

import { useRef, useState, useCallback } from 'react'
import { newMatch, startRound, resolveRound, decideTurn, makeRng, CARD_CAP, TACTICALS_PER_HALF, MERCY_LEAD, ROUND_CAP } from '../../engine'
import type { MatchState, Card, Formation, Tier } from '../../engine/types'
import type { Rng } from '../../engine/rng'
import { pickOpponentByDifficulty } from '../../data/remote/opponents.repo'
import { fetchPlayers } from '../../data/remote/players.repo'
import { buildQuickplayDeck } from './buildQuickplayDeck'
import type { PlayerCard, TacticalCard, CardInPlay } from '../../engine/types'
import { getSupabaseClient } from '../../data/remote/client'
import { opponents as staticOpponents } from '../../data/opponents'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'legendary'

/** Derived view-state exposed to presentational components. */
export interface QuickplayViewState {
  match: MatchState | null
  phase: 'idle' | 'loading' | 'playing' | 'result'
  error: string | null
  goalEvents: GoalEvent[]
  canCommit: boolean
}

export interface GoalEvent {
  id: string
  scorer: string
  isYou: boolean
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

  const [matchSnapshot, setMatchSnapshot] = useState<MatchState | null>(null)
  const [phase, setPhase] = useState<QuickplayViewState['phase']>('idle')
  const [error, setError] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [goalEvents, setGoalEvents] = useState<GoalEvent[]>([])

  const syncSnapshot = useCallback(() => {
    const m = matchRef.current
    setMatchSnapshot(m ? { ...m, players: [...m.players] as [typeof m.players[0], typeof m.players[1]] } : null)
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

      const commonPool = await fetchPlayers({ season: 2026, limit: 100 }, client)
        .catch(() => [] as PlayerCard[])
      const commonCards = commonPool.filter((c) => c.rarity === 'common')

      const opponentDeck = buildQuickplayDeck({
        premiumPicks: opponent.squad.filter((c) => c.rarity !== 'common').slice(0, 10),
        tacticalPicks: opponent.signatureTactical ?? [],
        captainId: opponent.squad[0]?.id ?? '',
        commonPool: [...commonCards, ...opponent.squad.filter((c) => c.rarity === 'common')],
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

      setPhase('playing')
      setDifficulty(chosenDifficulty)
      syncSnapshot()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setPhase('idle')
    }
  }, [syncSnapshot])

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
      const handIdx = p0.hand.findIndex((c) => c.id === tac.id)
      if (handIdx === -1) continue
      const [removed] = p0.hand.splice(handIdx, 1)
      if (removed) {
        const cip: CardInPlay = { card: removed, lane: 'attack', statuses: [], faceDown: false }
        p0.board.attack.push(cip)
        p0.tacticalsThisHalf += 1
      }
    }

    syncSnapshot()
  }, [syncSnapshot])

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

    if (goals0After > goalsBefore0) {
      for (let i = 0; i < goals0After - goalsBefore0; i++) {
        goalCounterRef.current += 1
        newEvents.push({
          id: `goal-you-${goalCounterRef.current}`,
          scorer: 'YOU',
          isYou: true,
        })
      }
    }

    if (goals1After > goalsBefore1) {
      for (let i = 0; i < goals1After - goalsBefore1; i++) {
        goalCounterRef.current += 1
        newEvents.push({
          id: `goal-them-${goalCounterRef.current}`,
          scorer: match.opponent.name,
          isYou: false,
        })
      }
    }

    if (newEvents.length > 0) {
      setGoalEvents((prev) => [...prev, ...newEvents])
    }

    if (match.winner !== null) {
      setPhase('result')
    } else {
      startRound(match, rng)
    }

    syncSnapshot()
  }, [syncSnapshot])

  const rematch = useCallback(async () => {
    const session = sessionRef.current
    if (!session) return
    setGoalEvents([])
    await start(session.deck, session.captainId, session.difficulty, session.seed + 1)
  }, [start])

  const canCommit =
    matchSnapshot !== null &&
    matchSnapshot.winner === null &&
    matchSnapshot.phase === 'plan'

  return {
    viewState: {
      match: matchSnapshot,
      phase,
      error,
      goalEvents,
      canCommit,
    },
    difficulty,
    setDifficulty,
    start,
    commitTurn,
    resolveCurrentRound,
    rematch,
  }
}

export { roundToMinute, computePhase, DIFFICULTY_TO_TIER, difficultyToTier, CARD_CAP, TACTICALS_PER_HALF, MERCY_LEAD }
