import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Scoreboard } from './index'

describe('Scoreboard', () => {
  it('renders the score', () => {
    render(<Scoreboard them={1} you={2} />)
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('renders the match clock', () => {
    render(<Scoreboard them={0} you={0} minute="45'" phase="HALF TIME" />)
    expect(screen.getByText("45'")).toBeTruthy()
    expect(screen.getByText('HALF TIME')).toBeTruthy()
  })

  it('renders the mercy marker when provided', () => {
    render(<Scoreboard them={1} you={3} mercy="You +2 · 1 from mercy" mercyHot />)
    expect(screen.getByText('You +2 · 1 from mercy')).toBeTruthy()
  })

  it('applies .et class when et=true', () => {
    const { container } = render(<Scoreboard them={2} you={2} et />)
    expect(container.querySelector('.scoreboard7.et')).toBeTruthy()
  })
})
