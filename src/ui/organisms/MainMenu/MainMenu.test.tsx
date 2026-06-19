import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MainMenu } from './index'

describe('MainMenu', () => {
  it('renders Quickplay as a gold button', () => {
    render(<MainMenu onQuickplay={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Quickplay' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveClass('btn-gold')
  })

  it('renders Arcade Run as a disabled button', () => {
    render(<MainMenu onQuickplay={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Arcade Run' })
    expect(btn).toBeDisabled()
  })

  it('shows a "Coming soon" label alongside Arcade Run', () => {
    render(<MainMenu onQuickplay={vi.fn()} />)
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
  })

  it('renders Collection and How to Play actions', () => {
    render(<MainMenu onQuickplay={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Collection' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'How to Play' })).toBeInTheDocument()
  })

  it('calls onQuickplay when Quickplay is clicked', async () => {
    const user = userEvent.setup()
    const onQuickplay = vi.fn()
    render(<MainMenu onQuickplay={onQuickplay} />)
    await user.click(screen.getByRole('button', { name: 'Quickplay' }))
    expect(onQuickplay).toHaveBeenCalledTimes(1)
  })

  it('does not call onQuickplay when Arcade Run is clicked (disabled)', async () => {
    const user = userEvent.setup()
    const onQuickplay = vi.fn()
    render(<MainMenu onQuickplay={onQuickplay} />)
    await user.click(screen.getByRole('button', { name: 'Arcade Run' }))
    expect(onQuickplay).not.toHaveBeenCalled()
  })
})
