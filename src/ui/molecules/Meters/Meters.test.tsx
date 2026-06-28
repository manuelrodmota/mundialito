import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { XGMeter, StaminaMeter } from './index'

describe('XGMeter', () => {
  it('sets data-heat attribute reflecting the prop', () => {
    const { container } = render(<XGMeter xg={0.40} heat={0} label="YOU" mine />)
    expect(container.querySelector('[data-heat="0"]')).toBeTruthy()
  })

  it('applies data-heat=3 for gassed heat level', () => {
    const { container } = render(<XGMeter xg={0.88} heat={3} label="THEM" />)
    expect(container.querySelector('[data-heat="3"]')).toBeTruthy()
  })

  it('renders the label text', () => {
    const { container } = render(<XGMeter xg={0.2} heat={1} label="YOU" />)
    expect(container).toHaveTextContent('YOU')
  })
})

describe('StaminaMeter', () => {
  it('renders the correct pip count', () => {
    const { container } = render(<StaminaMeter current={5} max={8} />)
    const pips = container.querySelectorAll('.pip')
    expect(pips.length).toBe(8)
  })

  it('marks the right number of filled pips', () => {
    const { container } = render(<StaminaMeter current={3} max={8} />)
    const fullPips = container.querySelectorAll('.pip.full')
    expect(fullPips.length).toBe(3)
  })

  it('renders the ramp hint when provided', () => {
    const { container } = render(<StaminaMeter current={8} max={8} rampLabel="+2 ramp" />)
    expect(container).toHaveTextContent('+2 ramp')
  })
})
