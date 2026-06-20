import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PlayerCard, Card } from '../../../engine/types'

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

function makeCommon(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    id: `c-${Math.random()}`,
    type: 'player',
    name: 'Common Player',
    nation: 'ARG',
    worldCup: 2026,
    position: 'MID',
    overall: 65,
    atk: 60,
    def: 62,
    cost: 1,
    rarity: 'common',
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

  describe('Quickplay defaults (20 player slots / 3 tactical cap / roster 16)', () => {
    it('renders the 20-slot budget hint text', async () => {
      mockFetchPlayers.mockResolvedValue([makePremium()])
      const { DeckBuilder } = await import('./index')

      render(<DeckBuilder onDeckReady={() => {}} onBack={() => {}} />)
      await waitFor(() => {
        expect(screen.getByText(/20-slot budget/i)).toBeInTheDocument()
      })
    })

    it('renders the tactical cap hint as "up to 3 tactical cards"', async () => {
      mockFetchPlayers.mockResolvedValue([makePremium()])
      const { DeckBuilder } = await import('./index')

      render(<DeckBuilder onDeckReady={() => {}} onBack={() => {}} />)
      await waitFor(() => {
        expect(screen.getByText(/up to 3 tactical cards/i)).toBeInTheDocument()
      })
    })
  })

  describe('Arcade XI builder (playerBudget=10, tacticalCap=1, rosterSize=11)', () => {
    async function renderArcadeBuilder(onDeckReady: (deck: Card[], captainId: string) => void = () => {}) {
      const premiums = [makePremium({ id: 'p1', name: 'Premium 1', slots: 5 })]
      const commons = Array.from({ length: 15 }, (_, i) =>
        makeCommon({ id: `c${i}`, name: `Common ${i}` }),
      )
      mockFetchPlayers.mockResolvedValue([...premiums, ...commons])

      vi.resetModules()
      const { DeckBuilder } = await import('./index')
      const user = userEvent.setup()

      render(
        <DeckBuilder
          playerBudget={10}
          tacticalCap={1}
          rosterSize={11}
          onDeckReady={onDeckReady}
          onBack={() => {}}
        />,
      )

      await waitFor(() => screen.getByText(/10-slot budget/i))
      return { user, premiums, commons }
    }

    it('shows the 10-slot budget in the hint text', async () => {
      await renderArcadeBuilder()
      expect(screen.getByText(/10-slot budget/i)).toBeInTheDocument()
    })

    it('renders the tactical cap hint as "up to 1 tactical card" (singular)', async () => {
      await renderArcadeBuilder()
      expect(screen.getByText(/up to 1 tactical card[^s]/i)).toBeInTheDocument()
    })

    it('shows a slot meter tracking progress against the 10-slot budget', async () => {
      await renderArcadeBuilder()
      const slotMeter = document.querySelector('.slot-meter')
      expect(slotMeter).toBeInTheDocument()
    })

    it('confirm button is disabled when no picks have been made (captain required)', async () => {
      await renderArcadeBuilder()
      const btns = screen.getAllByRole('button')
      const confirmBtn = btns.find((b) => b.classList.contains('btn-gold'))
      expect(confirmBtn).toBeDisabled()
    })

    it('confirm button label shows the correct per-prop budget (10 not 20)', async () => {
      await renderArcadeBuilder()
      const btns = screen.getAllByRole('button')
      const confirmBtn = btns.find((b) => b.classList.contains('btn-gold'))
      expect(confirmBtn?.textContent).toMatch(/\/10 slots/)
    })

    it('clicking Fill bench does not throw and updates picks pane', async () => {
      const { user } = await renderArcadeBuilder()
      const fillBtn = screen.getByRole('button', { name: /Fill bench/i })
      await user.click(fillBtn)
      expect(screen.getByText(/Bench · random commons/i)).toBeInTheDocument()
    })

    it('calls onDeckReady with an 11-player deck when a pick + fill + confirm flows through', async () => {
      const capturedDecks: { deck: Card[]; captainId: string }[] = []

      const premiums = [makePremium({ id: 'solo', name: 'Solo Star', slots: 5 })]
      const commons = Array.from({ length: 15 }, (_, i) =>
        makeCommon({ id: `cx${i}`, name: `Common X${i}` }),
      )
      mockFetchPlayers.mockResolvedValue([...premiums, ...commons])

      vi.resetModules()
      const { DeckBuilder } = await import('./index')
      const user = userEvent.setup()

      render(
        <DeckBuilder
          playerBudget={10}
          tacticalCap={1}
          rosterSize={11}
          onDeckReady={(deck, captainId) => capturedDecks.push({ deck, captainId })}
          onBack={() => {}}
        />,
      )

      await waitFor(() => screen.getByText(/10-slot budget/i))

      const firstCard = document.querySelector('.pool-cell [data-rarity]') as HTMLElement
      await user.click(firstCard)

      await user.click(screen.getByRole('button', { name: /Fill bench/i }))

      await waitFor(() => {
        expect(screen.getByText(/Bench · random commons/i)).toBeInTheDocument()
      })

      const btns = screen.getAllByRole('button')
      const confirmBtn = btns.find((b) => b.classList.contains('btn-gold')) as HTMLButtonElement

      await waitFor(() => expect(confirmBtn).not.toBeDisabled())

      await user.click(confirmBtn)

      await waitFor(() => expect(capturedDecks).toHaveLength(1))
      const players = capturedDecks[0]!.deck.filter((c) => c.type === 'player')
      expect(players).toHaveLength(11)
    })
  })
})
