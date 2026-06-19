import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IntentStrip } from './index'
import type { Intent } from '../../../engine/board'

const baseIntent: Intent = {
  formation: 'balanced',
  visibleTacticals: [],
  cardCount: 3,
  staminaSpent: 6,
}

describe('IntentStrip', () => {
  it('renders formation, card count, and stamina', () => {
    render(<IntentStrip opponentIntent={baseIntent} />)
    expect(screen.getByText('Balanced')).toBeInTheDocument()
    expect(screen.getByText(/3 cards/i)).toBeInTheDocument()
    expect(screen.getByText(/6 stamina/i)).toBeInTheDocument()
  })

  it('shows "played a Tactical" when visible tacticals present', () => {
    const intent: Intent = {
      ...baseIntent,
      visibleTacticals: [
        {
          id: 'tac-var',
          type: 'tactical',
          name: 'VAR Review',
          category: 'instant',
          cost: 2,
          slots: 1,
          rarity: 'rare',
          effect: { kind: 'var' },
        },
      ],
    }
    render(<IntentStrip opponentIntent={intent} />)
    expect(screen.getByText(/played a Tactical/i)).toBeInTheDocument()
  })

  it('does NOT leak card names or stats', () => {
    render(<IntentStrip opponentIntent={baseIntent} />)
    expect(screen.queryByText(/Messi/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ATK/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/DEF/i)).not.toBeInTheDocument()
  })

  it('renders nothing when opponentIntent is null', () => {
    const { container } = render(<IntentStrip opponentIntent={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows singular "card" for 1 card', () => {
    render(<IntentStrip opponentIntent={{ ...baseIntent, cardCount: 1 }} />)
    expect(screen.getByText(/1 card$/i)).toBeInTheDocument()
  })
})
