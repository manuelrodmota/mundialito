import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RunSummary } from './index'
import type { RunState } from '../../../engine/types'

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return {
    ...actual,
    useReducedMotion: () => true,
  }
})

function makeLossRun(): RunState {
  return {
    matchIndex: 1,
    stage: 'group',
    deck: [],
    captainId: 'c1',
    defeated: ['Brazil 1970'],
    alive: false,
  }
}

function makeWinRun(): RunState {
  return {
    matchIndex: 6,
    stage: 'final',
    deck: [],
    captainId: 'c1',
    defeated: ['Brazil 1970', 'Germany 1974', 'Argentina 1978', 'Italy 1982', 'France 1998', 'Spain 2010', 'Brazil 2002'],
    alive: true,
  }
}

describe('RunSummary', () => {
  describe('loss state', () => {
    it('shows run summary heading', () => {
      render(<RunSummary runState={makeLossRun()} onRestart={() => {}} onHome={() => {}} />)
      expect(screen.getByText('Defeated')).toBeInTheDocument()
    })

    it('shows how far the player reached', () => {
      render(<RunSummary runState={makeLossRun()} onRestart={() => {}} onHome={() => {}} />)
      expect(screen.getByText(/Fell in the/i)).toBeInTheDocument()
    })

    it('shows beaten opponents in the run list', () => {
      render(<RunSummary runState={makeLossRun()} onRestart={() => {}} onHome={() => {}} />)
      expect(screen.getByText('Brazil 1970')).toBeInTheDocument()
    })

    it('fires onRestart when Try Again is clicked', async () => {
      const onRestart = vi.fn()
      const user = userEvent.setup()
      render(<RunSummary runState={makeLossRun()} onRestart={onRestart} onHome={() => {}} />)
      await user.click(screen.getByRole('button', { name: 'Try Again' }))
      expect(onRestart).toHaveBeenCalled()
    })

    it('fires onHome when Main Menu is clicked', async () => {
      const onHome = vi.fn()
      const user = userEvent.setup()
      render(<RunSummary runState={makeLossRun()} onRestart={() => {}} onHome={onHome} />)
      await user.click(screen.getByRole('button', { name: 'Main Menu' }))
      expect(onHome).toHaveBeenCalled()
    })

    it('does not render the Trophy in a loss state', () => {
      const { container } = render(<RunSummary runState={makeLossRun()} onRestart={() => {}} onHome={() => {}} />)
      expect(container.querySelector('svg.trophy-cup')).toBeNull()
    })
  })

  describe('final-win state', () => {
    it('shows the Champions headline', () => {
      render(<RunSummary runState={makeWinRun()} onRestart={() => {}} onHome={() => {}} />)
      expect(screen.getByText('Champions!')).toBeInTheDocument()
    })

    it('renders the Trophy component', () => {
      const { container } = render(<RunSummary runState={makeWinRun()} onRestart={() => {}} onHome={() => {}} />)
      expect(container.querySelector('svg.trophy-cup')).toBeTruthy()
    })

    it('fires onRestart when Play Again is clicked', async () => {
      const onRestart = vi.fn()
      const user = userEvent.setup()
      render(<RunSummary runState={makeWinRun()} onRestart={onRestart} onHome={() => {}} />)
      await user.click(screen.getByRole('button', { name: 'Play Again' }))
      expect(onRestart).toHaveBeenCalled()
    })

    it('fires onHome when Main Menu is clicked', async () => {
      const onHome = vi.fn()
      const user = userEvent.setup()
      render(<RunSummary runState={makeWinRun()} onRestart={() => {}} onHome={onHome} />)
      await user.click(screen.getByRole('button', { name: 'Main Menu' }))
      expect(onHome).toHaveBeenCalled()
    })
  })
})
