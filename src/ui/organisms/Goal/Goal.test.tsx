import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Goal } from './index'

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return {
    ...actual,
    useReducedMotion: () => true,
  }
})

describe('Goal', () => {
  it('renders the GOAL text', () => {
    render(<Goal />)
    expect(screen.getByText('GOAL!')).toBeTruthy()
  })

  it('renders the scorer label', () => {
    render(<Goal scorer="YOU" />)
    expect(screen.getByText('YOU SCORES')).toBeTruthy()
  })

  it('renders without throwing under reduced motion', () => {
    expect(() => render(<Goal />)).not.toThrow()
  })
})
