import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return {
    ...actual,
    useReducedMotion: () => true,
  }
})

vi.mock('./ui/screens/Quickplay', () => ({
  Quickplay: ({ onBack }: { onBack: () => void }) => (
    <div>
      <h1>Quickplay</h1>
      <button type="button" onClick={onBack}>Back to menu</button>
    </div>
  ),
}))

vi.mock('./ui/screens/Arcade', () => ({
  Arcade: ({ onHome }: { onHome: () => void }) => (
    <div>
      <h1>Arcade Run</h1>
      <button type="button" onClick={onHome}>Back to menu</button>
    </div>
  ),
}))

describe('App', () => {
  it('shows the main menu as the default screen', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Quickplay' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Arcade Run' })).toBeInTheDocument()
  })

  it('transitions to the Quickplay screen when Quickplay is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Quickplay' }))
    expect(screen.getByRole('heading', { name: 'Quickplay' })).toBeInTheDocument()
  })

  it('returns to the menu from the Quickplay screen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Quickplay' }))
    await user.click(screen.getByRole('button', { name: 'Back to menu' }))
    expect(screen.getByRole('button', { name: 'Quickplay' })).toBeInTheDocument()
  })

  it('shows Arcade Run as an enabled button on the main menu', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Arcade Run' })).not.toBeDisabled()
  })

  it('transitions to the Arcade screen when Arcade Run is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Arcade Run' }))
    expect(screen.getByRole('heading', { name: 'Arcade Run' })).toBeInTheDocument()
  })

  it('transitions to the Collection placeholder', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Collection' }))
    expect(screen.getByRole('heading', { name: 'Collection' })).toBeInTheDocument()
  })

  it('transitions to the How to Play placeholder', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'How to Play' }))
    expect(screen.getByRole('heading', { name: 'How to Play' })).toBeInTheDocument()
  })
})
