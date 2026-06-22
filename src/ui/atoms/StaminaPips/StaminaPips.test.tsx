import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StaminaPips } from './index'

describe('StaminaPips', () => {
  it('renders one pip per stamina point, filling the remaining ones', () => {
    const { container } = render(<StaminaPips remaining={5} max={8} />)
    const pips = container.querySelectorAll('.stamina-pips .pip')
    const full = container.querySelectorAll('.stamina-pips .pip.full')
    expect(pips).toHaveLength(8)
    expect(full).toHaveLength(5)
  })

  it('shows the remaining/max label', () => {
    const { getByText } = render(<StaminaPips remaining={3} max={10} />)
    expect(getByText('3/10 ⚡')).toBeTruthy()
  })

  it('flags an over-budget lineup and never renders negative filled pips', () => {
    const { container } = render(<StaminaPips remaining={-2} max={8} />)
    expect(container.querySelector('.stamina-pips.over')).toBeTruthy()
    expect(container.querySelectorAll('.stamina-pips .pip.full')).toHaveLength(0)
    expect(container.querySelectorAll('.stamina-pips .pip')).toHaveLength(8)
  })
})
