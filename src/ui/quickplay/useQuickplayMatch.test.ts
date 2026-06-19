import { describe, it, expect, vi, beforeEach } from 'vitest'
import { difficultyToTier, DIFFICULTY_TO_TIER } from './useQuickplayMatch'

vi.mock('../../data/remote/opponents.repo', () => ({
  pickOpponentByDifficulty: vi.fn(),
}))

vi.mock('../../data/remote/players.repo', () => ({
  fetchPlayers: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../data/remote/client', () => ({
  getSupabaseClient: vi.fn().mockReturnValue({}),
}))

vi.mock('../../data/opponents', async () => ({
  opponents: [
    {
      id: 'opp-1',
      name: 'Test FC',
      nation: 'BRA',
      year: 2022,
      tier: 'C',
      strength: 75,
      squad: [
        {
          id: 'p1',
          type: 'player',
          name: 'Player 1',
          nation: 'BRA',
          worldCup: 2022,
          position: 'FWD',
          overall: 80,
          atk: 75,
          def: 40,
          cost: 2,
          rarity: 'common',
          slots: 1,
        },
      ],
      signatureTactical: [],
      preferredFormation: 'balanced',
      isChampion: false,
    },
  ],
}))

describe('difficultyToTier', () => {
  it('maps easy → D', () => {
    expect(difficultyToTier('easy')).toBe('D')
  })

  it('maps medium → C', () => {
    expect(difficultyToTier('medium')).toBe('C')
  })

  it('maps hard → B', () => {
    expect(difficultyToTier('hard')).toBe('B')
  })

  it('maps legendary → S', () => {
    expect(difficultyToTier('legendary')).toBe('S')
  })
})

describe('DIFFICULTY_TO_TIER mapping', () => {
  it('contains all 4 difficulty levels', () => {
    expect(DIFFICULTY_TO_TIER['easy']).toBeDefined()
    expect(DIFFICULTY_TO_TIER['medium']).toBeDefined()
    expect(DIFFICULTY_TO_TIER['hard']).toBeDefined()
    expect(DIFFICULTY_TO_TIER['legendary']).toBeDefined()
  })

  it('legendary is the highest numeric difficulty', () => {
    const values = Object.values(DIFFICULTY_TO_TIER)
    expect(DIFFICULTY_TO_TIER['legendary']).toBe(Math.max(...values))
  })
})

describe('hook integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports start, commitTurn, resolveCurrentRound, rematch functions', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useQuickplayMatch } = await import('./useQuickplayMatch')

    const { result } = renderHook(() => useQuickplayMatch())
    expect(typeof result.current.start).toBe('function')
    expect(typeof result.current.commitTurn).toBe('function')
    expect(typeof result.current.resolveCurrentRound).toBe('function')
    expect(typeof result.current.rematch).toBe('function')
  })

  it('starts in idle phase with no match', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { useQuickplayMatch } = await import('./useQuickplayMatch')

    const { result } = renderHook(() => useQuickplayMatch())
    expect(result.current.viewState.phase).toBe('idle')
    expect(result.current.viewState.match).toBeNull()
    expect(result.current.viewState.error).toBeNull()
  })
})
