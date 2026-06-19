import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DifficultyPicker } from './index'

vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}))

describe('DifficultyPicker', () => {
  it('renders all 4 difficulty options', () => {
    render(
      <DifficultyPicker selected="medium" onSelect={() => {}} onConfirm={() => {}} onBack={() => {}} />,
    )
    expect(screen.getByText('Easy')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Hard')).toBeInTheDocument()
    expect(screen.getByText('Legendary')).toBeInTheDocument()
  })

  it('shows tier labels including S for Legendary', () => {
    render(
      <DifficultyPicker selected="legendary" onSelect={() => {}} onConfirm={() => {}} onBack={() => {}} />,
    )
    expect(screen.getByText('S')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
  })

  it('calls onSelect when a difficulty is clicked', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(
      <DifficultyPicker selected="medium" onSelect={onSelect} onConfirm={() => {}} onBack={() => {}} />,
    )
    await user.click(screen.getByText('Hard'))
    expect(onSelect).toHaveBeenCalledWith('hard')
  })

  it('calls onConfirm when Kick Off is clicked', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <DifficultyPicker selected="easy" onSelect={() => {}} onConfirm={onConfirm} onBack={() => {}} />,
    )
    await user.click(screen.getByRole('button', { name: /kick off/i }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('disables Kick Off during loading', () => {
    render(
      <DifficultyPicker selected="easy" onSelect={() => {}} onConfirm={() => {}} onBack={() => {}} loading />,
    )
    expect(screen.getByRole('button', { name: /finding opponent/i })).toBeDisabled()
  })

  it('calls onBack when Back is clicked', async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    render(
      <DifficultyPicker selected="easy" onSelect={() => {}} onConfirm={() => {}} onBack={onBack} />,
    )
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('highlights the selected difficulty', () => {
    render(
      <DifficultyPicker selected="hard" onSelect={() => {}} onConfirm={() => {}} onBack={() => {}} />,
    )
    const hardButton = screen.getByText('Hard').closest('.dp-option')
    expect(hardButton).toHaveClass('selected')
  })
})
