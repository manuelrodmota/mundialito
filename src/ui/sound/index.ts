/**
 * Lightweight match audio manager (singleton).
 *
 * Two independent channels, both served from `public/sounds/`:
 *  - MUSIC — the looping crowd ambience (`crowd.m4a`), kept low and slowed down so it reads as a
 *    muffled background murmur rather than a foreground track.
 *  - SFX   — one-shot cues like the goal roar (`goal.m4a`, plays at full volume then fades out),
 *    plus any future effects.
 *
 * Each channel has its own mute flag, persisted to localStorage so it sticks across sessions.
 * React mirrors the flags through `subscribe()` (see useSoundControls).
 *
 * Framework-agnostic on purpose (no React) so any screen can drive it. All browser calls are
 * guarded: autoplay rejections and jsdom's unimplemented HTMLMediaElement are swallowed so audio
 * never throws into the UI or the test runner.
 */

const SOUNDS_BASE = '/sounds'

// Crowd ambience tuning — quiet and slowed so it sits behind the action.
const BACKGROUND_VOLUME = 0.10
const BACKGROUND_RATE = 1
const BACKGROUND_FADE_MS = 800

// Goal cue tuning — starts loud, holds, then eases down over the celebration.
const GOAL_PEAK_VOLUME = 0.9
const GOAL_HOLD_MS = 2200
const GOAL_FADE_MS = 5000
const GOAL_FADE_TICK_MS = 60

// Card draw/dismiss cue — short, subtle, allowed to overlap so a dealt hand riffles.
const CARD_VOLUME = 0.5

const MUSIC_MUTE_KEY = 'wcc.mute.music'
const SFX_MUTE_KEY = 'wcc.mute.sfx'

function canUseAudio(): boolean {
  return typeof window !== 'undefined' && typeof window.Audio !== 'undefined'
}

function loadMuted(key: string): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function persistMuted(key: string, muted: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return
    if (muted) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    // ignore (private mode / unavailable storage)
  }
}

type AudioContextCtor = typeof AudioContext

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    AudioContext?: AudioContextCtor
    webkitAudioContext?: AudioContextCtor
  }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

class SoundManager {
  private goalEl: HTMLAudioElement | null = null
  private cardEl: HTMLAudioElement | null = null
  private goalFadeTimer: ReturnType<typeof setInterval> | null = null
  private goalHoldTimer: ReturnType<typeof setTimeout> | null = null

  // Background loop runs through the Web Audio API: an AudioBufferSourceNode loops sample-accurately,
  // so the track repeats with no encoder-padding gap (which HTMLAudioElement.loop can't avoid).
  private audioCtx: AudioContext | null = null
  private bgBuffer: AudioBuffer | null = null
  private bgSource: AudioBufferSourceNode | null = null
  private bgGain: GainNode | null = null
  private bgLoading = false

  private musicMuted = loadMuted(MUSIC_MUTE_KEY)
  private sfxMuted = loadMuted(SFX_MUTE_KEY)
  /** Whether a screen wants the background loop running (board mounted), independent of the mute flag. */
  private crowdWanted = false
  private listeners = new Set<() => void>()

  // --- channel state / pub-sub (for React) ---------------------------------

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    this.listeners.forEach((l) => l())
  }

  isMusicMuted(): boolean {
    return this.musicMuted
  }

  isSfxMuted(): boolean {
    return this.sfxMuted
  }

  toggleMusic(): void {
    this.musicMuted = !this.musicMuted
    persistMuted(MUSIC_MUTE_KEY, this.musicMuted)
    this.applyCrowd()
    this.emit()
  }

  toggleSfx(): void {
    this.sfxMuted = !this.sfxMuted
    persistMuted(SFX_MUTE_KEY, this.sfxMuted)
    if (this.sfxMuted) this.stopGoal()
    this.emit()
  }

  // --- element lifecycle ----------------------------------------------------

  private ensureGoal(): HTMLAudioElement | null {
    if (!canUseAudio()) return null
    if (!this.goalEl) {
      this.goalEl = new Audio(`${SOUNDS_BASE}/goal.m4a`)
      this.goalEl.preload = 'auto'
    }
    return this.goalEl
  }

  private ensureCard(): HTMLAudioElement | null {
    if (!canUseAudio()) return null
    if (!this.cardEl) {
      this.cardEl = new Audio(`${SOUNDS_BASE}/card_draw.m4a`)
      this.cardEl.preload = 'auto'
    }
    return this.cardEl
  }

  private ensureCtx(): AudioContext | null {
    const Ctor = getAudioContextCtor()
    if (!Ctor) return null
    if (!this.audioCtx) this.audioCtx = new Ctor()
    return this.audioCtx
  }

  private async loadBg(ctx: AudioContext): Promise<AudioBuffer | null> {
    if (this.bgBuffer) return this.bgBuffer
    try {
      const res = await fetch(`${SOUNDS_BASE}/background.mp3`)
      const arr = await res.arrayBuffer()
      this.bgBuffer = await ctx.decodeAudioData(arr)
      return this.bgBuffer
    } catch {
      return null
    }
  }

  private clearGoalFade(): void {
    if (this.goalHoldTimer) {
      clearTimeout(this.goalHoldTimer)
      this.goalHoldTimer = null
    }
    if (this.goalFadeTimer) {
      clearInterval(this.goalFadeTimer)
      this.goalFadeTimer = null
    }
  }

  // --- SFX ------------------------------------------------------------------

  /** Play the goal cue from the top at peak volume, then fade it out gradually. */
  playGoal(): void {
    if (this.sfxMuted) return
    const el = this.ensureGoal()
    if (!el) return

    this.clearGoalFade()
    try {
      el.pause()
      el.currentTime = 0
      el.volume = GOAL_PEAK_VOLUME
      const playback = el.play()
      if (playback && typeof playback.catch === 'function') playback.catch(() => {})
    } catch {
      return
    }

    // Hold at peak so the goal rings out, then ease the volume down. The fade is exponential
    // (multiplicative) so it tapers the way the ear hears loudness — gentle near the end instead
    // of cutting off when a linear ramp hits the floor.
    const floor = 0.004
    const steps = Math.max(1, Math.round(GOAL_FADE_MS / GOAL_FADE_TICK_MS))
    const factor = Math.pow(floor / GOAL_PEAK_VOLUME, 1 / steps)
    this.goalHoldTimer = setTimeout(() => {
      this.goalHoldTimer = null
      this.goalFadeTimer = setInterval(() => {
        const next = el.volume * factor
        if (next <= floor) {
          el.volume = 0
          try {
            el.pause()
          } catch {
            // ignore
          }
          this.clearGoalFade()
        } else {
          el.volume = next
        }
      }, GOAL_FADE_TICK_MS)
    }, GOAL_HOLD_MS)
  }

  /** Play the short card draw/dismiss cue. Clones the source element so rapid calls (a hand
   *  dealing in, or a stack of cards sweeping to the discard) overlap into a riffle. */
  playCard(): void {
    if (this.sfxMuted) return
    const base = this.ensureCard()
    if (!base) return
    try {
      const el = base.cloneNode(true) as HTMLAudioElement
      el.volume = CARD_VOLUME
      const playback = el.play()
      if (playback && typeof playback.catch === 'function') playback.catch(() => {})
    } catch {
      // ignore
    }
  }

  private stopGoal(): void {
    this.clearGoalFade()
    const el = this.goalEl
    if (!el) return
    try {
      el.pause()
      el.currentTime = 0
    } catch {
      // ignore
    }
  }

  // --- MUSIC (background loop, gapless via Web Audio) -----------------------

  /** A screen wants the background loop running (call on board mount). */
  startCrowd(): void {
    this.crowdWanted = true
    this.applyCrowd()
  }

  /** The background loop is no longer wanted (call on board unmount). */
  stopCrowd(): void {
    this.crowdWanted = false
    this.applyCrowd()
  }

  /** Reconcile the loop with the desired state (wanted + not muted → play, else fade out). */
  private applyCrowd(): void {
    if (this.crowdWanted && !this.musicMuted) void this.fadeCrowdIn()
    else this.fadeCrowdOut()
  }

  /** Linear gain ramp to `target` over the standard fade, from the current value. */
  private rampGain(gain: GainNode, target: number): void {
    const ctx = this.audioCtx
    if (!ctx) return
    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(target, now + BACKGROUND_FADE_MS / 1000)
  }

  private async fadeCrowdIn(): Promise<void> {
    const ctx = this.ensureCtx()
    if (!ctx) return
    try {
      await ctx.resume()
    } catch {
      // ignore (no user gesture yet — a later call will resume)
    }

    // Already looping → just bring the volume back up.
    if (this.bgSource && this.bgGain) {
      this.rampGain(this.bgGain, BACKGROUND_VOLUME)
      return
    }

    if (this.bgLoading) return
    this.bgLoading = true
    const buffer = await this.loadBg(ctx)
    this.bgLoading = false

    // The wanted/muted state (or a concurrent start) may have changed while decoding.
    if (!buffer || !this.crowdWanted || this.musicMuted || this.bgSource) return

    const gain = ctx.createGain()
    gain.gain.value = 0
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.playbackRate.value = BACKGROUND_RATE
    source.connect(gain).connect(ctx.destination)
    source.start()
    this.bgSource = source
    this.bgGain = gain
    this.rampGain(gain, BACKGROUND_VOLUME)
  }

  private fadeCrowdOut(): void {
    const ctx = this.audioCtx
    const source = this.bgSource
    const gain = this.bgGain
    if (!ctx || !source || !gain) return
    this.bgSource = null
    this.bgGain = null

    const fade = BACKGROUND_FADE_MS / 1000
    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(0, now + fade)
    try {
      source.stop(now + fade + 0.05)
    } catch {
      // ignore
    }
    source.onended = () => {
      try {
        source.disconnect()
        gain.disconnect()
      } catch {
        // ignore
      }
    }
  }
}

export const matchSound = new SoundManager()
