import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TacticCard } from './index'
import type { TacticalCard } from '../../../engine/types'

const mockInstant: TacticalCard = {
  id: 'tac-1',
  type: 'tactical',
  name: 'VAR Review',
  category: 'instant',
  cost: 2,
  slots: 2,
  rarity: 'epic',
  effect: { kind: 'var' },
}

const mockPower: TacticalCard = {
  id: 'tac-2',
  type: 'tactical',
  name: 'Hand of God',
  category: 'power',
  cost: 3,
  slots: 3,
  rarity: 'legendary',
  effect: { kind: 'handOfGod' },
}

describe('TacticCard', () => {
  it('renders the card name', () => {
    render(<TacticCard card={mockInstant} />)
    expect(screen.getByText('VAR Review')).toBeTruthy()
  })

  it('sets data-cat for instant category', () => {
    const { container } = render(<TacticCard card={mockInstant} />)
    expect(container.querySelector('[data-cat="instant"]')).toBeTruthy()
  })

  it('sets data-cat for power category', () => {
    const { container } = render(<TacticCard card={mockPower} />)
    expect(container.querySelector('[data-cat="power"]')).toBeTruthy()
  })

  it('renders the description when provided', () => {
    render(<TacticCard card={mockInstant} description="Cancel the opponent's tactic." />)
    expect(screen.getByText("Cancel the opponent's tactic.")).toBeTruthy()
  })

  it('renders face-down card when faceDown=true', () => {
    const { container } = render(<TacticCard card={mockInstant} faceDown />)
    expect(container.querySelector('.wcard.back')).toBeTruthy()
    expect(screen.queryByText('VAR Review')).toBeNull()
  })
})
