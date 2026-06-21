import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ArcadeRunViewState, UseArcadeRunReturn } from '../../run/useArcadeRun'
import type { RunState } from '../../../engine/types'

vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}))

vi.mock('../../../data/remote/client', () => ({
  getSupabaseClient: vi.fn().mockReturnValue({}),
}))

vi.mock('../../../data/remote/players.repo', () => ({
  fetchPlayers: vi.fn().mockResolvedValue([]),
  fetchAvailableSeasons: vi.fn().mockResolvedValue([2026]),
  fetchTeamsForSeason: vi.fn().mockResolvedValue([]),
}))

const baseRunState: RunState = {
  matchIndex: 0,
  stage: 'group',
  deck: [],
  captainId: 'p1',
  defeated: [],
  alive: true,
}

const baseViewState: ArcadeRunViewState = {
  runState: null,
  matchSnapshot: null,
  phase: 'building',
  error: null,
  goalEvents: [],
  canCommit: false,
  opponentIntent: null,
  revealBoards: null,
  roundReport: null,
  reward: null,
  nextOpponent: null,
}

function makeReturn(overrides: Partial<ArcadeRunViewState> = {}): UseArcadeRunReturn {
  return {
    viewState: { ...baseViewState, ...overrides },
    startRun: vi.fn(),
    startStage: vi.fn(),
    commitTurn: vi.fn(),
    reveal: vi.fn(),
    nextRound: vi.fn(),
    claimReward: vi.fn(),
    swapTacticalReward: vi.fn(),
    declineReward: vi.fn(),
    setCaptain: vi.fn(),
    removeDeckCard: vi.fn(),
    proceedToNextStage: vi.fn(),
    surrenderRun: vi.fn(),
  }
}

vi.mock('../../run/useArcadeRun', async (orig) => {
  const actual = await orig<typeof import('../../run/useArcadeRun')>()
  return { ...actual, useArcadeRun: vi.fn() }
})

async function mockArcadeRun(overrides: Partial<ArcadeRunViewState> = {}) {
  const { useArcadeRun } = await import('../../run/useArcadeRun')
  vi.mocked(useArcadeRun).mockReturnValue(makeReturn(overrides))
}

async function renderArcade(onHome = vi.fn()) {
  const { Arcade } = await import('./index')
  return render(<Arcade onHome={onHome} />)
}

describe('Arcade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the deck builder in building phase', async () => {
    await mockArcadeRun({ phase: 'building' })
    await renderArcade()
    expect(screen.getByText(/loading players/i)).toBeInTheDocument()
  })

  it('renders RunMap when phase is map', async () => {
    await mockArcadeRun({ phase: 'map', runState: baseRunState })
    await renderArcade()
    expect(screen.getByText('Arcade Run')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /abandon run/i })).toBeInTheDocument()
  })

  it('renders RunSummary loss screen when phase is runover', async () => {
    const lostRunState: RunState = { ...baseRunState, alive: false }
    await mockArcadeRun({ phase: 'runover', runState: lostRunState })
    await renderArcade()
    expect(screen.getByText('Run Over')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls onHome when "Abandon Run" is clicked from the map phase', async () => {
    const onHome = vi.fn()
    await mockArcadeRun({ phase: 'map', runState: baseRunState })
    await renderArcade(onHome)
    await userEvent.setup().click(screen.getByRole('button', { name: /abandon run/i }))
    expect(onHome).toHaveBeenCalledTimes(1)
  })
})
