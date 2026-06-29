import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import userEvent from '@testing-library/user-event'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { AccountProvider } from './account/AccountProvider'
import { LanguageProvider } from './ui/i18n'

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

function renderApp() {
  render(
    <LanguageProvider>
      <AuthProvider>
        <AccountProvider>
          <App />
        </AccountProvider>
      </AuthProvider>
    </LanguageProvider>,
  )
}

/** A menu tile button, found by its name label. */
function tile(name: string): HTMLButtonElement {
  return screen.getByText(name, { selector: '.tile-name' }).closest('button') as HTMLButtonElement
}

/** Tap through the splash screen to reach the home menu. */
async function enterMenu(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: /Press anywhere to play/i }))
}

describe('App', () => {
  it('starts on the splash screen', () => {
    renderApp()
    expect(screen.getByRole('button', { name: /Press anywhere to play/i })).toBeInTheDocument()
    expect(screen.queryByText('Quickplay', { selector: '.tile-name' })).toBeNull()
  })

  it('enters the home menu from the splash', async () => {
    const user = userEvent.setup()
    renderApp()
    await enterMenu(user)
    expect(tile('Quickplay')).toBeInTheDocument()
    expect(tile('Arcade Run')).toBeInTheDocument()
  })

  it('transitions to the Quickplay screen and back', async () => {
    const user = userEvent.setup()
    renderApp()
    await enterMenu(user)
    await user.click(tile('Quickplay'))
    expect(screen.getByRole('heading', { name: 'Quickplay' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to menu' }))
    expect(tile('Quickplay')).toBeInTheDocument()
  })

  it('keeps Arcade locked until login', async () => {
    const user = userEvent.setup()
    renderApp()
    await enterMenu(user)
    expect(tile('Arcade Run')).toHaveAttribute('aria-disabled', 'true')
    await user.click(tile('Arcade Run'))
    expect(screen.queryByRole('heading', { name: 'Arcade Run' })).toBeNull()
  })

  it('opens Arcade after signing in', async () => {
    const user = userEvent.setup()
    renderApp()
    await enterMenu(user)
    await user.click(tile('Login with Google'))
    await user.click(tile('Arcade Run'))
    expect(screen.getByRole('heading', { name: 'Arcade Run' })).toBeInTheDocument()
  })

  it('opens the Account screen (with Log out) after signing in', async () => {
    const user = userEvent.setup()
    renderApp()
    await enterMenu(user)
    await user.click(tile('Login with Google'))
    await user.click(tile('Account'))
    expect(screen.getByRole('button', { name: /Log out/i })).toBeInTheDocument()
    // Dev-stub profile shows as the signed-in manager.
    expect(screen.getByRole('heading', { name: 'Manager' })).toBeInTheDocument()
  })

  it('opens the Collection from the account, showing the empty state', async () => {
    const user = userEvent.setup()
    renderApp()
    await enterMenu(user)
    await user.click(tile('Login with Google'))
    await user.click(tile('Account'))
    await user.click(screen.getByRole('button', { name: /View collection/i }))
    expect(screen.getByRole('heading', { name: /No cards yet/i })).toBeInTheDocument()
  })

  it('transitions to the How to Play screen', async () => {
    const user = userEvent.setup()
    renderApp()
    await enterMenu(user)
    await user.click(tile('How to Play'))
    expect(screen.getByRole('heading', { name: 'How to Play' })).toBeInTheDocument()
  })
})
