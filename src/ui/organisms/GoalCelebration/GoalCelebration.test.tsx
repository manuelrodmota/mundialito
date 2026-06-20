import { describe, it, expect, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { GoalCelebration } from './index'
import type { GoalEvent } from '../../quickplay/useQuickplayMatch'

vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}))

function makeEvent(overrides: Partial<GoalEvent> = {}): GoalEvent {
  return {
    id: 'goal-1',
    scorer: 'YOU',
    isYou: true,
    score: [1, 0] as [number, number],
    ...overrides,
  }
}

describe('GoalCelebration', () => {
  it('renders GOAL when there is a pending goal event', () => {
    render(<GoalCelebration events={[makeEvent()]} onDismiss={() => {}} />)
    expect(screen.getByText('GOAL')).toBeInTheDocument()
  })

  it('calls onDismiss after the celebration duration', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<GoalCelebration events={[makeEvent()]} onDismiss={onDismiss} />)
    await act(async () => {
      vi.advanceTimersByTime(1800)
    })
    expect(onDismiss).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('dismisses immediately when the veil is clicked', () => {
    const onDismiss = vi.fn()
    const { container } = render(<GoalCelebration events={[makeEvent()]} onDismiss={onDismiss} />)
    fireEvent.click(container.querySelector('.overlay')!)
    expect(onDismiss).toHaveBeenCalled()
  })

  it('shows opponent scorer for non-player goals', () => {
    render(
      <GoalCelebration
        events={[makeEvent({ isYou: false, scorer: 'Brazil FC' })]}
        onDismiss={() => {}}
      />,
    )
    expect(screen.getByText(/BRAZIL FC SCORES/i)).toBeInTheDocument()
  })

  it('shows nothing when no events pending', () => {
    const { container } = render(<GoalCelebration events={[]} onDismiss={() => {}} />)
    expect(screen.queryByText('GOAL')).not.toBeInTheDocument()
    expect(container.querySelector('.overlay')).not.toBeInTheDocument()
  })

  it('renders GOAL in reduced-motion mode (no animation crash)', () => {
    render(<GoalCelebration events={[makeEvent()]} onDismiss={() => {}} />)
    expect(screen.getByText('GOAL')).toBeInTheDocument()
  })
})
