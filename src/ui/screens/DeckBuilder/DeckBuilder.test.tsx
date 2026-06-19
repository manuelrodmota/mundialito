import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PlayerCard } from '../../../engine/types'

vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}))

vi.mock('../../../data/remote/client', () => ({
  getSupabaseClient: vi.fn().mockReturnValue({}),
}))

const mockFetchPlayers = vi.fn()
vi.mock('../../../data/remote/players.repo', () => ({
  fetchPlayers: (...args: unknown[]) => mockFetchPlayers(...args),
}))

function makePremium(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    id: `p-${Math.random()}`,
    type: 'player',
    name: 'Star Player',
    nation: 'BRA',
    worldCup: 2026,
    position: 'FWD',
    overall: 90,
    atk: 88,
    def: 45,
    cost: 3,
    rarity: 'epic',
    slots: 1,
    ...overrides,
  }
}

describe('DeckBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', async () => {
    mockFetchPlayers.mockReturnValue(new Promise(() => {}))
    const { DeckBuilder } = await import('./index')
    render(<DeckBuilder onDeckReady={() => {}} onBack={() => {}} />)
    expect(screen.getByText(/Loading players/i)).toBeInTheDocument()
  })

  it('shows error state on fetch failure', async () => {
    mockFetchPlayers.mockRejectedValue(new Error('Network error'))
    const { DeckBuilder } = await import('./index')

    render(<DeckBuilder onDeckReady={() => {}} onBack={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no premiums returned', async () => {
    mockFetchPlayers.mockResolvedValue([
      makePremium({ rarity: 'common' }),
    ])
    const { DeckBuilder } = await import('./index')

    render(<DeckBuilder onDeckReady={() => {}} onBack={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText(/No players available/i)).toBeInTheDocument()
    })
  })

  it('renders the slot meter after loading premiums', async () => {
    mockFetchPlayers.mockResolvedValue([makePremium()])
    const { DeckBuilder } = await import('./index')

    render(<DeckBuilder onDeckReady={() => {}} onBack={() => {}} />)
    await waitFor(() => {
      expect(document.querySelector('.slot-meter')).toBeInTheDocument()
    })
  })

  it('calls onBack when back button is visible and clicked', async () => {
    mockFetchPlayers.mockResolvedValue([makePremium()])
    const { DeckBuilder } = await import('./index')

    const onBack = vi.fn()
    const user = userEvent.setup()
    render(<DeckBuilder onDeckReady={() => {}} onBack={onBack} />)

    await waitFor(() => screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    expect(onBack).toHaveBeenCalled()
  })
})
