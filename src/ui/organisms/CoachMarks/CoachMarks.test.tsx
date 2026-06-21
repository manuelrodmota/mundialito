import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CoachMarks } from './index'
import type { CoachStep } from './steps'

const steps: CoachStep[] = [
  { target: '.zone-a', title: 'First thing', body: 'Body A' },
  { target: '.zone-b', title: 'Second thing', body: 'Body B' },
]

describe('CoachMarks', () => {
  it('walks through the steps and calls onDone on the last', async () => {
    const onDone = vi.fn()
    render(<CoachMarks steps={steps} onDone={onDone} />)

    expect(screen.getByText('First thing')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Second thing')).toBeInTheDocument()

    expect(onDone).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /got it/i }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('skips the tour from any step', async () => {
    const onDone = vi.fn()
    render(<CoachMarks steps={steps} onDone={onDone} />)

    await userEvent.click(screen.getByRole('button', { name: /skip tour/i }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
