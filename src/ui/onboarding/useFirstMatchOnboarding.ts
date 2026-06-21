import { useCallback, useState } from 'react'

const STORAGE_KEY = 'wcc.onboarded.match.v1'

function readDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // localStorage unavailable (private mode, blocked, test env): degrade to "already
    // done" so we never show a tour we can't remember dismissing.
    return true
  }
}

export interface FirstMatchOnboarding {
  /** True until the player has finished (or skipped) the first-match coach-marks. */
  active: boolean
  /** Mark onboarding complete — persists so it never shows again. */
  dismiss: () => void
}

/**
 * Tracks whether the one-time first-match coach-mark tour should run.
 * Backed by localStorage so it fires once across the whole app (Quickplay or Arcade,
 * whichever match the player reaches first), and survives reloads. Degrades to
 * "already done" if localStorage is unavailable, so it never blocks play.
 */
export function useFirstMatchOnboarding(): FirstMatchOnboarding {
  const [done, setDone] = useState<boolean>(readDone)

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore — non-persistent, but still hide for this session */
    }
    setDone(true)
  }, [])

  return { active: !done, dismiss }
}
