import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MatchBoard } from './index'
import type { MatchState, PlayerState, OpponentTeam } from '../../../engine/types'

vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}))

function makePlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    goals: 0,
    xg: 0.3,
    fatigue: 5,
    scoredFirstAt: null,
    maxStamina: 8,
    stamina: 8,
    drawPile: [],
    hand: [],
    discard: [],
    locked: [],
    exiled: [],
    tacticalsThisHalf: 0,
    tacticSpent: 0,
    tacticBonus: 0,
    board: { attack: [], defense: [] },
    formation: 'balanced',
    powers: [],
    captainId: 'captain-1',
    momentum: 0,
    handOfGodUsed: false,
    ...overrides,
  }
}

function makeOpponent(): OpponentTeam {
  return {
    id: 'opp-1',
    name: 'Test FC',
    nation: 'BRA',
    year: 2022,
    tier: 'C',
    strength: 75,
    squad: [],
    preferredFormation: 'balanced',
    isChampion: false,
  }
}

function makeMatch(overrides: Partial<MatchState> = {}): MatchState {
  return {
    round: 1,
    extraTime: false,
    etRound: 0,
    players: [makePlayerState({ goals: 1 }), makePlayerState({ goals: 0 })],
    opponent: makeOpponent(),
    phase: 'plan',
    winner: null,
    ...overrides,
  }
}

describe('MatchBoard', () => {
  it('renders scoreboard with current score', () => {
    render(
      <MatchBoard
        match={makeMatch()}
        onCommit={() => {}}
      />,
    )
    const scoreEl = document.querySelector('.sb-g.you')
    expect(scoreEl?.textContent).toBe('1')
  })

  it('renders both XG meters', () => {
    render(
      <MatchBoard
        match={makeMatch()}
        onCommit={() => {}}
      />,
    )
    const meters = document.querySelectorAll('.xgm4')
    expect(meters.length).toBeGreaterThanOrEqual(2)
  })

  it('renders clock phase', () => {
    render(
      <MatchBoard
        match={makeMatch({ round: 3 })}
        onCommit={() => {}}
      />,
    )
    expect(screen.getByText('1ST HALF')).toBeInTheDocument()
  })

  it('renders EXTRA TIME banner when in ET', () => {
    render(
      <MatchBoard
        match={makeMatch({ extraTime: true, round: 11 })}
        onCommit={() => {}}
      />,
    )
    expect(document.querySelector('.et-banner7')).toBeInTheDocument()
  })

  it('renders commit button when canCommit is true', () => {
    render(
      <MatchBoard
        match={makeMatch()}
        onCommit={() => {}}
        canCommit
      />,
    )
    expect(screen.getByRole('button', { name: /pass round|lock in/i })).toBeInTheDocument()
  })

  it('calls onCommit when commit button is clicked', async () => {
    const onCommit = vi.fn()
    const user = userEvent.setup()
    render(
      <MatchBoard
        match={makeMatch()}
        onCommit={onCommit}
        canCommit
      />,
    )
    await user.click(screen.getByRole('button', { name: /pass round|lock in/i }))
    expect(onCommit).toHaveBeenCalledOnce()
  })

  it('renders deck pile counts', () => {
    render(
      <MatchBoard
        match={makeMatch({
          players: [
            makePlayerState({ drawPile: [{ id: 'd1', type: 'player', name: 'P', nation: 'BRA', worldCup: 2022, position: 'FWD', overall: 70, atk: 60, def: 30, cost: 2, rarity: 'common', slots: 1 }] }),
            makePlayerState(),
          ],
        })}
        onCommit={() => {}}
      />,
    )
    expect(document.querySelectorAll('.deckpile5').length).toBeGreaterThan(0)
  })
})
