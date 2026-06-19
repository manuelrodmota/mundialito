import { describe, it, expect } from 'vitest'
import { NATIONS, NEUTRAL_BANDS, crestSrc } from './nations'

describe('NATIONS', () => {
  it('resolves known nations to 3-tuple hex arrays', () => {
    const argentina = NATIONS['Argentina']
    expect(argentina).toHaveLength(3)
    expect(argentina[0]).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('provides Brazil flag bands', () => {
    const brazil = NATIONS['Brazil']
    expect(brazil).toBeDefined()
    expect(brazil).toHaveLength(3)
  })

  it('provides a neutral fallback for unknown nations', () => {
    expect(NEUTRAL_BANDS).toHaveLength(3)
    expect(NEUTRAL_BANDS[0]).toBe('#525252')
  })
})

describe('crestSrc', () => {
  it('returns a fingerprinted URL for nations with crest art', () => {
    const src = crestSrc('Argentina')
    expect(src).not.toBeNull()
    expect(typeof src).toBe('string')
  })

  it('returns a URL for France', () => {
    expect(crestSrc('France')).not.toBeNull()
  })

  it('returns null for nations without crest art', () => {
    expect(crestSrc('Atlantis')).toBeNull()
  })

  it('returns null for the neutral placeholder nation', () => {
    expect(crestSrc('—')).toBeNull()
  })

  it('handles alternate spellings (Türkiye/Turkey)', () => {
    expect(crestSrc('Turkey')).not.toBeNull()
    expect(crestSrc('Türkiye')).not.toBeNull()
  })
})
