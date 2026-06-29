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
  fetchAvailableSeasons: vi.fn().mockResolvedValue([2026]),
  fetchTeamsForSeason: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../data/remote/opponents.repo', () => ({
  pickOpponentByDifficulty: vi.fn().mockResolvedValue(null),
}))

vi.mock('../../../data/opponents', () => ({
  opponents: [],
}))

function allPlayersTile(): HTMLButtonElement {
  return screen.getByText('Build with all players', { selector: '.tile-name' }).closest('button') as HTMLButtonElement
}

describe('Quickplay', () => {
  it('renders the squad-source chooser as the first sub-screen', () => {
    render(<Quickplay onBack={() => {}} />)
    expect(allPlayersTile()).toBeInTheDocument()
    expect(screen.getByText('Build with your deck', { selector: '.tile-name' })).toBeInTheDocument()
  })

  it('calls onBack when Menu is clicked on the chooser', async () => {
    const onBack = vi.fn()
    const userEvent = (await import('@testing-library/user-event')).default
    render(<Quickplay onBack={onBack} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Menu' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('"build with all players" opens the deck builder; its Menu returns to the chooser', async () => {
    vi.mocked(await import('../../../data/remote/players.repo')).fetchPlayers = vi.fn().mockRejectedValue(new Error('fail'))
    const { waitFor } = await import('@testing-library/react')
    const user = (await import('@testing-library/user-event')).default.setup()

    render(<Quickplay onBack={() => {}} />)
    await user.click(allPlayersTile())
    await waitFor(() => screen.getByText(/Failed to load/i))

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    expect(allPlayersTile()).toBeInTheDocument()
  })
})
