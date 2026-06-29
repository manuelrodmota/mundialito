import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MainMenu } from './index'
import { AuthProvider } from '../../../auth/AuthProvider'
import { LanguageProvider } from '../../i18n'

function renderMenu() {
  const handlers = {
    onQuickplay: vi.fn(),
    onArcade: vi.fn(),
    onAccount: vi.fn(),
    onMultiplayer: vi.fn(),
    onHowToPlay: vi.fn(),
  }
  render(
    <LanguageProvider>
      <AuthProvider>
        <MainMenu {...handlers} />
      </AuthProvider>
    </LanguageProvider>,
  )
  return handlers
}

/** Find a menu tile button by its name label (robust to badges in the accessible name). */
function tile(name: string): HTMLButtonElement {
  return screen.getByText(name, { selector: '.tile-name' }).closest('button') as HTMLButtonElement
}

describe('MainMenu', () => {
  it('keeps Quickplay and How to Play available while anonymous', async () => {
    const user = userEvent.setup()
    const h = renderMenu()
    await user.click(tile('Quickplay'))
    expect(h.onQuickplay).toHaveBeenCalledTimes(1)
    await user.click(tile('How to Play'))
    expect(h.onHowToPlay).toHaveBeenCalledTimes(1)
  })

  it('locks the gated row while anonymous', async () => {
    const user = userEvent.setup()
    const h = renderMenu()
    expect(tile('Arcade Run')).toHaveAttribute('aria-disabled', 'true')
    expect(tile('Account')).toHaveAttribute('aria-disabled', 'true')

    await user.click(tile('Arcade Run'))
    await user.click(tile('Account'))
    expect(h.onArcade).not.toHaveBeenCalled()
    expect(h.onAccount).not.toHaveBeenCalled()
  })

  it('unlocks the gated row after the Login tile signs in', async () => {
    const user = userEvent.setup()
    const h = renderMenu()
    await user.click(tile('Login with Google'))

    // Login tile now shows a disabled "Signed in" state.
    expect(tile('Signed in')).toBeDisabled()

    expect(tile('Arcade Run')).toHaveAttribute('aria-disabled', 'false')
    await user.click(tile('Arcade Run'))
    expect(h.onArcade).toHaveBeenCalledTimes(1)

    await user.click(tile('Account'))
    expect(h.onAccount).toHaveBeenCalledTimes(1)
  })
})
