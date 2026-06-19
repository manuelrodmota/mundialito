import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './index'

describe('Button', () => {
  it('renders with the gold variant class', () => {
    render(<Button variant="gold">Start a run</Button>)
    const btn = screen.getByRole('button', { name: 'Start a run' })
    expect(btn).toHaveClass('btn-gold')
  })

  it('renders with the primary variant class', () => {
    render(<Button variant="primary">Quick run</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-primary')
  })

  it('renders with the ghost variant class', () => {
    render(<Button variant="ghost">Cancel</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-ghost')
  })

  it('renders with btn-big class when size=big', () => {
    render(<Button size="big">Kick off</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-big')
  })

  it('fires onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('respects disabled state', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Disabled</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
