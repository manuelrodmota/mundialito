import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardModal } from './index'
import type { PlayerCard } from '../../../engine/types'

const mockCard: PlayerCard = {
  id: 'cm-1',
  type: 'player',
  name: 'Van Dijk',
  nation: 'Netherlands',
  worldCup: 2026,
  position: 'DEF',
  overall: 89,
  atk: 49,
  def: 89,
  cost: 4,
  rarity: 'epic',
  slots: 2,
}

describe('CardModal', () => {
  it('renders card anatomy when open', () => {
    const { getAllByText } = render(<CardModal card={mockCard} open onClose={() => {}} />)
    expect(getAllByText('Van Dijk').length).toBeGreaterThan(0)
  })

  it('does not render when open=false', () => {
    render(<CardModal card={mockCard} open={false} onClose={() => {}} />)
    expect(screen.queryByText('Van Dijk')).toBeNull()
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<CardModal card={mockCard} open onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<CardModal card={mockCard} open onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
