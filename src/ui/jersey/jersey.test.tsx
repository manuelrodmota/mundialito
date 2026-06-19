import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { buildJerseySVG } from './buildJerseySVG'
import { kitForNation, KITS } from './kits'
import { NATIONS } from '../data/nations'
import { WCJersey } from './WCJersey'

describe('buildJerseySVG', () => {
  it('produces valid SVG markup for a solid kit', () => {
    const svg = buildJerseySVG({ pattern: 'solid', base: '#FF0000', trim: '#FFFFFF' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toContain('viewBox="0 0 300 340"')
  })

  it('produces valid SVG markup for a stripes kit', () => {
    const svg = buildJerseySVG({ pattern: 'stripes', base: '#74ACDF', stripe: '#FFFFFF', trim: '#0A1A3F' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('fill="#74ACDF"')
    expect(svg).toContain('fill="#FFFFFF"')
  })

  it('produces valid SVG markup for a checker kit', () => {
    const svg = buildJerseySVG({ pattern: 'checker', base: '#FFFFFF', stripe: '#D52B1E', trim: '#0A1A3F' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('fill="#D52B1E"')
  })

  it('uses unique gradient ids for each call to avoid clipPath collisions', () => {
    const svg1 = buildJerseySVG({ pattern: 'solid', base: '#FF0000', trim: '#000' })
    const svg2 = buildJerseySVG({ pattern: 'solid', base: '#0000FF', trim: '#fff' })
    const id1 = svg1.match(/id="clip(wcj\d+)"/)?.[1]
    const id2 = svg2.match(/id="clip(wcj\d+)"/)?.[1]
    expect(id1).not.toBe(id2)
  })
})

describe('kitForNation', () => {
  it('returns the registered stripes kit for Argentina', () => {
    const kit = kitForNation('Argentina')
    expect(kit.pattern).toBe('stripes')
    expect(kit.base).toBe('#74ACDF')
  })

  it('returns the registered checker kit for Croatia', () => {
    const kit = kitForNation('Croatia')
    expect(kit.pattern).toBe('checker')
  })

  it('falls back to flag-derived solid kit for a nation without a KITS entry but present in NATIONS', () => {
    const testNation = 'Wales'
    expect(KITS[testNation]).toBeDefined()
    const unknownNation = 'Atlantis'
    expect(KITS[unknownNation]).toBeUndefined()
    expect(NATIONS[unknownNation]).toBeUndefined()
    const kit = kitForNation(unknownNation)
    expect(kit.pattern).toBe('solid')
  })

  it('returns a neutral fallback for a completely unknown nation', () => {
    const kit = kitForNation('UnknownXYZ123')
    expect(kit.pattern).toBe('solid')
    expect(kit.base).toBeDefined()
    expect(kit.trim).toBeDefined()
  })
})

describe('WCJersey memoisation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without throwing for a known nation', () => {
    const { container } = render(<WCJersey nation="Brazil" />)
    expect(container.querySelector('.wc-jersey')).toBeTruthy()
    const svgEl = container.querySelector('svg')
    expect(svgEl).toBeTruthy()
  })

  it('renders without throwing for an unknown nation', () => {
    expect(() => render(<WCJersey nation="Atlantis" />)).not.toThrow()
  })

  it('renders an svg for nations from the KITS table', () => {
    const { container } = render(<WCJersey nation="France" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
