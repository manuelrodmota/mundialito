import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultScreen } from './index'
import type { MatchState, PlayerState, OpponentTeam } from '../../../engine/types'

vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}))

function makePlayer(goals: number, xg: number = 0.5): PlayerState {
  return {
    goals,
    xg,
    fatigue: 0,
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
    captainId: 'c1',
    momentum: 0,
    handOfGodUsed: false,
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

describe('ResultScreen', () => {
  it('renders win state when player wins', () => {
    const match: MatchState = {
      round: 10,
      extraTime: false,
      etRound: 0,
      players: [makePlayer(3), makePlayer(1)],
      opponent: makeOpponent(),
      phase: 'end',
      winner: 0,
    }
    render(<ResultScreen match={match} onRematch={() => {}} onBack={() => {}} />)
    expect(screen.getByText('Victory!')).toBeInTheDocument()
    expect(screen.getByText('Full-time result')).toBeInTheDocument()
  })

  it('renders loss state when player loses', () => {
    const match: MatchState = {
      round: 10,
      extraTime: false,
      etRound: 0,
      players: [makePlayer(1), makePlayer(3)],
      opponent: makeOpponent(),
      phase: 'end',
      winner: 1,
    }
    render(<ResultScreen match={match} onRematch={() => {}} onBack={() => {}} />)
    expect(screen.getByText('Defeat')).toBeInTheDocument()
  })

  it('shows mercy rule note when 3-goal lead ends match early', () => {
    const match: MatchState = {
      round: 7,
      extraTime: false,
      etRound: 0,
      players: [makePlayer(4), makePlayer(1)],
      opponent: makeOpponent(),
      phase: 'end',
      winner: 0,
    }
    render(<ResultScreen match={match} onRematch={() => {}} onBack={() => {}} />)
    expect(screen.getByText(/mercy rule/i)).toBeInTheDocument()
  })

  it('shows ET note for extra-time winner', () => {
    const match: MatchState = {
      round: 10,
      extraTime: true,
      etRound: 1,
      players: [makePlayer(2), makePlayer(1)],
      opponent: makeOpponent(),
      phase: 'end',
      winner: 0,
    }
    render(<ResultScreen match={match} onRematch={() => {}} onBack={() => {}} />)
    expect(screen.getByText(/extra time/i)).toBeInTheDocument()
  })

  it('calls onRematch when Rematch is clicked', async () => {
    const onRematch = vi.fn()
    const user = userEvent.setup()
    const match: MatchState = {
      round: 10,
      extraTime: false,
      etRound: 0,
      players: [makePlayer(2), makePlayer(0)],
      opponent: makeOpponent(),
      phase: 'end',
      winner: 0,
    }
    render(<ResultScreen match={match} onRematch={onRematch} onBack={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Rematch' }))
    expect(onRematch).toHaveBeenCalled()
  })

  it('never shows Defeat when the winner is unknown', () => {
    const match: MatchState = {
      round: 10,
      extraTime: false,
      etRound: 0,
      players: [makePlayer(2), makePlayer(2)],
      opponent: makeOpponent(),
      phase: 'end',
      winner: null,
    }
    render(<ResultScreen match={match} onRematch={() => {}} onBack={() => {}} />)
    expect(screen.queryByText('Defeat')).not.toBeInTheDocument()
    expect(screen.getByText('Full time')).toBeInTheDocument()
  })

  it('shows a waiting label and disables Rematch once requested', () => {
    const match: MatchState = {
      round: 10,
      extraTime: false,
      etRound: 0,
      players: [makePlayer(3), makePlayer(1)],
      opponent: makeOpponent(),
      phase: 'end',
      winner: 0,
    }
    render(
      <ResultScreen match={match} onRematch={() => {}} onBack={() => {}} rematchPending />,
    )
    const btn = screen.getByRole('button', { name: 'Waiting for opponent…' })
    expect(btn).toBeDisabled()
  })

  it('prompts when the opponent wants a rematch', () => {
    const match: MatchState = {
      round: 10,
      extraTime: false,
      etRound: 0,
      players: [makePlayer(1), makePlayer(3)],
      opponent: makeOpponent(),
      phase: 'end',
      winner: 1,
    }
    render(
      <ResultScreen
        match={match}
        onRematch={() => {}}
        onBack={() => {}}
        opponentWantsRematch
      />,
    )
    expect(screen.getByText('Your opponent wants a rematch')).toBeInTheDocument()
  })

  it('calls onBack when Main Menu is clicked', async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    const match: MatchState = {
      round: 10,
      extraTime: false,
      etRound: 0,
      players: [makePlayer(1), makePlayer(2)],
      opponent: makeOpponent(),
      phase: 'end',
      winner: 1,
    }
    render(<ResultScreen match={match} onRematch={() => {}} onBack={onBack} />)
    await user.click(screen.getByRole('button', { name: 'Main Menu' }))
    expect(onBack).toHaveBeenCalled()
  })
})
