import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlayerCard } from './index'
import type { PlayerCard as PlayerCardData } from '../../../engine/types'

const mockCard: PlayerCardData = {
  id: 'test-1',
  type: 'player',
  name: 'Mbappé',
  nation: 'France',
  worldCup: 2026,
  position: 'FWD',
  overall: 97,
  atk: 97,
  def: 53,
  cost: 5,
  rarity: 'legendary',
  slots: 3,
}

describe('PlayerCard', () => {
  it('renders the player name', () => {
    render(<PlayerCard card={mockCard} />)
    expect(screen.getByText('Mbappé')).toBeTruthy()
  })

  it('renders ATK and DEF stats', () => {
    const { container } = render(<PlayerCard card={mockCard} />)
    expect(container.querySelector('.atk')).toBeTruthy()
    expect(container.querySelector('.def')).toBeTruthy()
    expect(container.querySelector('.def')?.textContent).toContain('53')
  })

  it('sets data-rarity attribute for CSS', () => {
    const { container } = render(<PlayerCard card={mockCard} />)
    expect(container.querySelector('[data-rarity="legendary"]')).toBeTruthy()
  })

  it('renders the WCJersey in the figure slot', () => {
    const { container } = render(<PlayerCard card={mockCard} />)
    expect(container.querySelector('.wc-jersey')).toBeTruthy()
  })

  it('renders face-down card when faceDown=true', () => {
    const { container } = render(<PlayerCard card={mockCard} faceDown />)
    expect(container.querySelector('.wcard.back')).toBeTruthy()
    expect(screen.queryByText('Mbappé')).toBeNull()
  })

  it('renders captain band when isCaptain=true', () => {
    render(<PlayerCard card={mockCard} isCaptain />)
    expect(screen.getByText('CAPTAIN')).toBeTruthy()
  })

  it('renders booked overlay when status.booked=true', () => {
    const { container } = render(<PlayerCard card={mockCard} status={{ booked: true }} />)
    expect(container.querySelector('.st-booked')).toBeTruthy()
  })

  it('renders injured overlay when status.injured=true', () => {
    const { container } = render(<PlayerCard card={mockCard} status={{ injured: true }} />)
    expect(container.querySelector('.st-injured')).toBeTruthy()
  })

  it('fires onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<PlayerCard card={mockCard} onClick={onClick} />)
    await user.click(screen.getByText('Mbappé'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
