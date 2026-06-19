import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlaceholderScreen } from './index'

describe('PlaceholderScreen', () => {
  it('renders the passed title', () => {
    render(<PlaceholderScreen title="Quickplay coming soon" onBack={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Quickplay coming soon' })).toBeInTheDocument()
  })

  it('renders the optional note when provided', () => {
    render(<PlaceholderScreen title="Test" note="WCC-023 lands here" onBack={vi.fn()} />)
    expect(screen.getByText('WCC-023 lands here')).toBeInTheDocument()
  })

  it('does not render a note element when omitted', () => {
    render(<PlaceholderScreen title="Test" onBack={vi.fn()} />)
    expect(screen.queryByText(/WCC/)).not.toBeInTheDocument()
  })

  it('calls onBack when "Back to menu" is clicked', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    render(<PlaceholderScreen title="Test" onBack={onBack} />)
    await user.click(screen.getByRole('button', { name: 'Back to menu' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
