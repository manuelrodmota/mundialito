import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeckPile } from './index'

describe('DeckPile', () => {
  it('renders the count and label', () => {
    render(<DeckPile kind="draw" count={12} mark="WC" label="Draw" />)
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText('Draw')).toBeTruthy()
  })

  it('renders empty state when count=0', () => {
    const { container } = render(<DeckPile kind="draw" count={0} label="Draw" />)
    expect(container.querySelector('.dp-card.empty')).toBeTruthy()
  })

  it('renders the cue label when provided', () => {
    render(<DeckPile kind="locked" count={3} mark="★" label="Bench" cue="back at HT" />)
    expect(screen.getByText('back at HT')).toBeTruthy()
  })

  it('applies the kind class', () => {
    const { container } = render(<DeckPile kind="exiled" count={2} mark="✕" label="Spent" />)
    expect(container.querySelector('.exiled')).toBeTruthy()
  })
})
