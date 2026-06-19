import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CapChip } from './index'

describe('CapChip', () => {
  it('renders player cap chip with correct content', () => {
    render(<CapChip kind="players" current={2} max={4} />)
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('adds .full class when at the limit for players', () => {
    const { container } = render(<CapChip kind="players" current={4} max={4} />)
    expect(container.querySelector('.full')).toBeTruthy()
  })

  it('renders tactic cap chip', () => {
    render(<CapChip kind="tactics" current={1} max={2} />)
    expect(screen.getByText('1')).toBeTruthy()
  })

  it('adds .tac class for tactics kind', () => {
    const { container } = render(<CapChip kind="tactics" current={1} max={2} />)
    expect(container.querySelector('.tac')).toBeTruthy()
  })

  it('adds .full class when tactics are spent', () => {
    const { container } = render(<CapChip kind="tactics" current={2} max={2} />)
    expect(container.querySelector('.full')).toBeTruthy()
  })
})
