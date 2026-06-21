import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssistedPool } from './index'
import type { PlayerCard, Position } from '../../../engine/types'

function player(over: Partial<PlayerCard> & { id: string; position: Position; overall: number }): PlayerCard {
  return {
    type: 'player',
    name: over.id,
    nation: 'ARG',
    worldCup: 2026,
    atk: over.overall,
    def: over.overall,
    cost: 2,
    rarity: 'rare',
    slots: 1,
    ...over,
  }
}

const recommended: Record<Position, number> = { GK: 1, DEF: 3, MID: 2, FWD: 2 }

const players: PlayerCard[] = [
  player({ id: 'gk1', position: 'GK', overall: 90 }),
  player({ id: 'def1', position: 'DEF', overall: 88 }),
  player({ id: 'def2', position: 'DEF', overall: 86 }),
  player({ id: 'mid1', position: 'MID', overall: 84 }),
  player({ id: 'fwd1', position: 'FWD', overall: 92 }),
]

function setup(overrides: Partial<Parameters<typeof AssistedPool>[0]> = {}) {
  const onAdd = vi.fn()
  const onRemove = vi.fn()
  const onInfo = vi.fn()
  render(
    <AssistedPool
      players={players}
      picks={[]}
      slotsUsed={0}
      playerBudget={20}
      captainId={null}
      recommended={recommended}
      onAdd={onAdd}
      onRemove={onRemove}
      onInfo={onInfo}
      {...overrides}
    />,
  )
  return { onAdd, onRemove, onInfo }
}

describe('AssistedPool', () => {
  it('renders a section per position with a need indicator', () => {
    setup()
    expect(screen.getByText('Goalkeeper')).toBeInTheDocument()
    expect(screen.getByText('Defense')).toBeInTheDocument()
    expect(screen.getByText('Midfield')).toBeInTheDocument()
    expect(screen.getByText('Attack')).toBeInTheDocument()
  })

  it('marks a position unmet (⚠) until the recommended count is reached', () => {
    setup({ picks: [] })
    // GK needs 1, have 0 → unmet
    expect(screen.getByText('⚠ 0/1')).toBeInTheDocument()
  })

  it('marks a position met (✓) once the recommendation is satisfied', () => {
    setup({ picks: [players[0]] }) // one GK picked
    expect(screen.getByText('✓ 1/1')).toBeInTheDocument()
  })

  it('adds a player on click when not yet picked', async () => {
    const user = userEvent.setup()
    const { onAdd } = setup()
    const gkSection = screen.getByText('Goalkeeper').closest('section')!
    await user.click(within(gkSection).getByText('gk1'))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'gk1' }))
  })

  it('removes a player on click when already picked', async () => {
    const user = userEvent.setup()
    const { onRemove } = setup({ picks: [players[0]] })
    const gkSection = screen.getByText('Goalkeeper').closest('section')!
    await user.click(within(gkSection).getByText('gk1'))
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'gk1' }))
  })

  it('limits the curated list and expands with "show all"', async () => {
    const user = userEvent.setup()
    const manyDefs = Array.from({ length: 8 }, (_, i) =>
      player({ id: `def${i}`, position: 'DEF', overall: 80 + i }),
    )
    setup({ players: manyDefs, curatedLimit: 3 })
    const defSection = screen.getByText('Defense').closest('section')!
    // top 3 by overall shown initially (87, 86, 85)
    expect(within(defSection).getByText('def7')).toBeInTheDocument()
    expect(within(defSection).queryByText('def0')).not.toBeInTheDocument()
    await user.click(within(defSection).getByText('Show all 8'))
    expect(within(defSection).getByText('def0')).toBeInTheDocument()
  })
})
