import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { DesignSystemGallery } from './DesignSystemGallery'

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return {
    ...actual,
    useReducedMotion: () => true,
  }
})

describe('DesignSystemGallery', () => {
  it('renders without throwing', () => {
    expect(() => render(<DesignSystemGallery />)).not.toThrow()
  })

  it('renders the Foundations section heading', () => {
    const { getAllByText } = render(<DesignSystemGallery />)
    expect(getAllByText('Color').length).toBeGreaterThan(0)
  })

  it('renders the Components section heading', () => {
    const { getAllByText } = render(<DesignSystemGallery />)
    expect(getAllByText('Buttons').length).toBeGreaterThan(0)
  })

  it('renders the Patterns section heading', () => {
    const { container } = render(<DesignSystemGallery />)
    expect(container.querySelector('h2')).toBeTruthy()
    const headings = container.querySelectorAll('h2')
    const texts = Array.from(headings).map((h) => h.textContent ?? '')
    expect(texts.some((t) => t.includes('Scoreboard'))).toBe(true)
  })

  it('renders the Run & meta section heading', () => {
    const { container } = render(<DesignSystemGallery />)
    const headings = container.querySelectorAll('h2')
    const texts = Array.from(headings).map((h) => h.textContent ?? '')
    expect(texts.some((t) => t.includes('Run map'))).toBe(true)
  })
})
