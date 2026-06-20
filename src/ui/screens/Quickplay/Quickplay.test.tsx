import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Quickplay } from './index'

vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}))

vi.mock('../../../data/remote/client', () => ({
  getSupabaseClient: vi.fn().mockReturnValue({}),
}))

vi.mock('../../../data/remote/players.repo', () => ({
  fetchPlayers: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../data/remote/opponents.repo', () => ({
  pickOpponentByDifficulty: vi.fn().mockResolvedValue(null),
}))

vi.mock('../../../data/opponents', () => ({
  opponents: [],
}))

describe('Quickplay', () => {
  it('renders the deck builder as the first sub-screen', () => {
    render(<Quickplay onBack={() => {}} />)
    expect(screen.getByText(/loading players/i)).toBeInTheDocument()
  })

  it('calls onBack when the back button is clicked from deckbuilder error state', async () => {
    vi.mocked(await import('../../../data/remote/players.repo')).fetchPlayers = vi.fn().mockRejectedValue(new Error('fail'))

    const onBack = vi.fn()
    const { waitFor } = await import('@testing-library/react')
    const userEvent = (await import('@testing-library/user-event')).default

    render(<Quickplay onBack={onBack} />)
    await waitFor(() => screen.getByText(/Failed to load/i))

    await userEvent.setup().click(screen.getByRole('button', { name: 'Menu' }))
    expect(onBack).toHaveBeenCalled()
  })
})
