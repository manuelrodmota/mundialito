import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RunMap } from './index'
import type { RunState, OpponentTeam } from '../../../engine/types'

const baseRun: RunState = {
  matchIndex: 0,
  stage: 'group',
  deck: [],
  captainId: 'p1',
  defeated: [],
  alive: true,
}

const opponent: OpponentTeam = {
  id: 'bra70',
  name: 'Brazil',
  nation: 'BRA',
  year: 1970,
  tier: 'A',
  strength: 88,
  squad: [],
  preferredFormation: 'offensive',
  isChampion: false,
  blurb: 'Jogo bonito.',
}

describe('RunMap', () => {
  it('renders the bracket ladder with 7 nodes', () => {
    render(
      <RunMap
        runState={baseRun}
        nextOpponent={opponent}
        onPlayNext={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getAllByText(/Group|R16|QF|SF|Final/i).length).toBeGreaterThanOrEqual(7)
  })

  it('marks completed stages as done and current stage as now', () => {
    const run: RunState = {
      ...baseRun,
      matchIndex: 2,
      defeated: ['Germany 1990', 'Argentina 1986'],
    }
    render(
      <RunMap
        runState={run}
        nextOpponent={opponent}
        onPlayNext={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getByText('Germany 1990')).toBeInTheDocument()
    expect(screen.getByText('Argentina 1986')).toBeInTheDocument()
  })

  it('shows the next-opponent panel with name and tier stars', () => {
    render(
      <RunMap
        runState={baseRun}
        nextOpponent={opponent}
        onPlayNext={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getByText('Brazil')).toBeInTheDocument()
  })

  it('fires onPlayNext when the play button is clicked', async () => {
    const onPlayNext = vi.fn()
    render(
      <RunMap
        runState={baseRun}
        nextOpponent={opponent}
        onPlayNext={onPlayNext}
        onBack={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /play next match/i }))
    expect(onPlayNext).toHaveBeenCalledOnce()
  })

  it('shows "Play the Final" button on the final stage', async () => {
    const finalRun: RunState = {
      ...baseRun,
      matchIndex: 6,
      stage: 'final',
      defeated: ['t1', 't2', 't3', 't4', 't5', 't6'],
    }
    const finalOpponent: OpponentTeam = { ...opponent, isChampion: true, tier: 'S' }
    const onPlayNext = vi.fn()
    render(
      <RunMap
        runState={finalRun}
        nextOpponent={finalOpponent}
        onPlayNext={onPlayNext}
        onBack={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /play the final/i }))
    expect(onPlayNext).toHaveBeenCalledOnce()
  })

  it('fires onBack when the abandon button is clicked', async () => {
    const onBack = vi.fn()
    render(
      <RunMap
        runState={baseRun}
        nextOpponent={opponent}
        onPlayNext={vi.fn()}
        onBack={onBack}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /abandon run/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('does not render NextPanel when nextOpponent is null', () => {
    render(
      <RunMap
        runState={baseRun}
        nextOpponent={null}
        onPlayNext={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.queryByText('Brazil')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /play next match/i })).not.toBeInTheDocument()
  })
})
