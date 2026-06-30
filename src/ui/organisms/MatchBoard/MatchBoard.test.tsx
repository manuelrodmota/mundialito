import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MatchBoard } from './index'
import type { MatchState, PlayerState, OpponentTeam } from '../../../engine/types'
import type { RoundReport, SideReport } from '../../run/useArcadeRun'

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

function makeSideReport(overrides: Partial<SideReport> = {}): SideReport {
  return {
    atkEff: 50, defEff: 50, formation: 'balanced', atkMult: 1, defMult: 1,
    fatigue: 5, fatigueDefMult: 1, rarityBonus: 0, synAtk: 0, synDef: 0,
    scored: false, xg: 0.3, pressureBefore: 0.2, pressureAfter: 0.3,
    ...overrides,
  }
}

function makeRoundReport(overrides: Partial<RoundReport> = {}): RoundReport {
  return {
    round: 7, extraTime: false, halftime: false,
    youXg: 0.3, themXg: 0.2, youGoalsThisRound: 0, themGoalsThisRound: 0,
    youGoalsTotal: 1, themGoalsTotal: 0, decided: false,
    you: makeSideReport(), them: makeSideReport(),
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

  it('clock during a reveal freezes on the resolved round, not the already-advanced match.round', () => {
    // Engine advanced match.round to 8 after round 7 resolved; the report is for round 7.
    // Before the fix the scoreboard read match.round (8 → 90'); it must read the resolved round (75').
    render(
      <MatchBoard
        match={makeMatch({ round: 8 })}
        phase="reveal"
        roundReport={makeRoundReport({ round: 7 })}
        onCommit={() => {}}
      />,
    )
    expect(document.querySelector('.sb-min')?.textContent).toBe("75'")
  })

  it('the full-time round that triggers ET still reads 90 (not an ET minute) in its report', () => {
    // Round 8 resolved into ET: match.round=9, match.extraTime=true, but the round-8 report's
    // extraTime flag is the post-resolution value. A regulation-count round must read 90'.
    render(
      <MatchBoard
        match={makeMatch({ round: 9, extraTime: true })}
        phase="reveal"
        roundReport={makeRoundReport({ round: 8, extraTime: true })}
        onCommit={() => {}}
      />,
    )
    expect(document.querySelector('.sb-min')?.textContent).toBe("90'")
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
