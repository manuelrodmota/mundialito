import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TacticalSlot } from './index'
import type { TacticalCard } from '../../../engine/types'

vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}))

const mockTactical: TacticalCard = {
  id: 'tac-offside',
  type: 'tactical',
  name: 'Offside Trap',
  category: 'instant',
  cost: 2,
  slots: 1,
  rarity: 'rare',
  effect: { kind: 'offsideTrap' },
}

describe('TacticalSlot', () => {
  it('renders the callout when an active tactical is present', () => {
    render(
      <TacticalSlot
        activeTactical={mockTactical}
        tacticalsThisHalf={1}
        canPlayTactical={false}
        availableTacticals={[]}
        onPlayTactical={() => {}}
      />,
    )
    const callout = document.querySelector('.tac-callout')
    expect(callout?.textContent).toMatch(/OFFSIDE TRAP/i)
  })

  it('shows per-half cap counter', () => {
    render(
      <TacticalSlot
        activeTactical={null}
        tacticalsThisHalf={1}
        canPlayTactical={true}
        availableTacticals={[]}
        onPlayTactical={() => {}}
      />,
    )
    expect(document.querySelector('.cap-chip5.tac')).toBeInTheDocument()
    expect(document.querySelector('.cap-chip5.tac')?.textContent).toMatch(/1\/2 tactics/)
  })

  it('blocks play when canPlayTactical is false', () => {
    render(
      <TacticalSlot
        activeTactical={null}
        tacticalsThisHalf={2}
        canPlayTactical={false}
        availableTacticals={[mockTactical]}
        onPlayTactical={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: /play/i })).not.toBeInTheDocument()
  })

  it('shows play buttons when canPlayTactical is true', async () => {
    const onPlay = vi.fn()
    const user = userEvent.setup()
    render(
      <TacticalSlot
        activeTactical={null}
        tacticalsThisHalf={0}
        canPlayTactical={true}
        availableTacticals={[mockTactical]}
        onPlayTactical={onPlay}
      />,
    )
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[0]!)
    expect(onPlay).toHaveBeenCalledWith(mockTactical)
  })

  it('shows full cap chip when at the limit', () => {
    render(
      <TacticalSlot
        activeTactical={null}
        tacticalsThisHalf={2}
        canPlayTactical={false}
        availableTacticals={[]}
        onPlayTactical={() => {}}
      />,
    )
    const chip = document.querySelector('.cap-chip5.tac')
    expect(chip).toHaveClass('full')
    expect(chip?.textContent).toMatch(/2\/2 tactics/)
  })
})
