import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Trophy } from './index'

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return {
    ...actual,
    useReducedMotion: () => true,
  }
})

describe('Trophy', () => {
  it('renders the trophy SVG', () => {
    const { container } = render(<Trophy />)
    expect(container.querySelector('svg.trophy-cup')).toBeTruthy()
  })

  it('renders an optional label', () => {
    render(<Trophy label="World Champions" />)
    expect(screen.getByText('World Champions')).toBeTruthy()
  })

  it('renders without throwing under reduced motion', () => {
    expect(() => render(<Trophy label="Test" />)).not.toThrow()
  })

  it('renders without label when none is provided', () => {
    const { container } = render(<Trophy />)
    expect(container.querySelector('.mvp-tag')).toBeNull()
  })
})
