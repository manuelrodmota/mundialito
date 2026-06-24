import { useSyncExternalStore } from 'react'
import { matchSound } from './index'

export interface SoundControls {
  musicMuted: boolean
  sfxMuted: boolean
  toggleMusic: () => void
  toggleSfx: () => void
}

/** React mirror of the two mute channels, kept in sync via the manager's pub-sub. */
export function useSoundControls(): SoundControls {
  const musicMuted = useSyncExternalStore(
    (cb) => matchSound.subscribe(cb),
    () => matchSound.isMusicMuted(),
    () => matchSound.isMusicMuted(),
  )
  const sfxMuted = useSyncExternalStore(
    (cb) => matchSound.subscribe(cb),
    () => matchSound.isSfxMuted(),
    () => matchSound.isSfxMuted(),
  )
  return {
    musicMuted,
    sfxMuted,
    toggleMusic: () => matchSound.toggleMusic(),
    toggleSfx: () => matchSound.toggleSfx(),
  }
}
