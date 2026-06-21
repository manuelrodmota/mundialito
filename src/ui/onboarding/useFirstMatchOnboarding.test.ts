import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFirstMatchOnboarding } from './useFirstMatchOnboarding'

// In-memory localStorage — the test env (Node 22 + jsdom) does not provide a working one.
function makeStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size
    },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeStorage())
})

describe('useFirstMatchOnboarding', () => {
  it('is active on a fresh install', () => {
    const { result } = renderHook(() => useFirstMatchOnboarding())
    expect(result.current.active).toBe(true)
  })

  it('becomes inactive after dismiss and persists', () => {
    const first = renderHook(() => useFirstMatchOnboarding())
    act(() => first.result.current.dismiss())
    expect(first.result.current.active).toBe(false)

    // A fresh hook (e.g. next session) reads the persisted flag and stays inactive.
    const second = renderHook(() => useFirstMatchOnboarding())
    expect(second.result.current.active).toBe(false)
  })

  it('degrades to inactive when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined)
    const { result } = renderHook(() => useFirstMatchOnboarding())
    expect(result.current.active).toBe(false)
  })
})
