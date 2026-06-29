import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardDetailModal } from './index'
import type { PlayerCard, TacticalCard } from '../../../engine/types'

vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}))

const mockPlayer: PlayerCard = {
  id: 'messi',
  type: 'player',
  name: 'Messi',
  nation: 'ARG',
  worldCup: 2022,
  position: 'FWD',
  overall: 95,
  atk: 95,
  def: 45,
  cost: 4,
  rarity: 'legendary',
  slots: 1,
}

const mockTactical: TacticalCard = {
  id: 'tac-var',
  type: 'tactical',
  name: 'VAR Review',
  category: 'instant',
  cost: 2,
  slots: 1,
  rarity: 'rare',
  effect: { kind: 'var' },
}

describe('CardDetailModal', () => {
  it('renders player card ATK/DEF and WC tag', () => {
    render(
      <CardDetailModal
        card={mockPlayer}
        open
        onClose={() => {}}
      />,
    )
    expect(screen.getAllByText(/ARG/).length).toBeGreaterThan(0)
    expect(screen.getByText(/ARG · World Cup 2022/)).toBeInTheDocument()
    expect(screen.getByText(/ATK 95 \/ DEF 45/)).toBeInTheDocument()
  })

  it('renders tactical card with description', () => {
    render(
      <CardDetailModal
        card={mockTactical}
        open
        onClose={() => {}}
      />,
    )
    expect(screen.getAllByText(/VAR Review/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/INSTANT/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/cancels one Tactical Card/).length).toBeGreaterThan(0)
  })

  it('shows opponent team blurb when provided', () => {
    render(
      <CardDetailModal
        card={mockPlayer}
        open
        onClose={() => {}}
        teamBlurb="Brazil 2022 — World Champions"
      />,
    )
    expect(screen.getByText('Brazil 2022 — World Champions')).toBeInTheDocument()
  })

  it('closes on button click', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<CardDetailModal card={mockPlayer} open onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders nothing when card is null', () => {
    const { container } = render(
      <CardDetailModal card={null} open onClose={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
