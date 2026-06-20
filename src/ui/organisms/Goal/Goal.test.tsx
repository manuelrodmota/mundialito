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
  it('renders the GOAL wordmark', () => {
    render(<Goal isYou />)
    expect(screen.getByText('GOAL')).toBeTruthy()
  })

  it('shows YOU SCORE for your goal, with scoreline', () => {
    render(<Goal isYou score={[2, 1]} />)
    expect(screen.getByText(/YOU SCORE · 2 – 1/)).toBeTruthy()
  })

  it('shows the opponent name for their goal', () => {
    render(<Goal isYou={false} scorer="Brazil" />)
    expect(screen.getByText(/BRAZIL SCORES/)).toBeTruthy()
  })

  it('renders without throwing under reduced motion', () => {
    expect(() => render(<Goal isYou />)).not.toThrow()
  })
})
