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

// Missed-shot cues — the strike (ball_kick) then the groan (missed_goal) just after it.
const KICK_VOLUME = 0.7
const MISS_VOLUME = 0.85
const MISS_GAP_FALLBACK_MS = 350
// Short hold on the groan, so it spends most of its clip fading out (lingers/dies away).
const MISS_HOLD_MS = 300

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

/** Hold + fade timers for one one-shot SFX element, so a fresh play can cancel the old fade. */
interface FadeChannel {
  hold: ReturnType<typeof setTimeout> | null
  fade: ReturnType<typeof setInterval> | null
}

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    AudioContext?: AudioContextCtor
    webkitAudioContext?: AudioContextCtor
  }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

/** Find the loop window by trimming leading/trailing near-silence from the buffer. Encoder padding
 *  and quiet head/tail are what make a buffer loop sound gappy even though the loop itself is
 *  sample-accurate — looping start→end instead of 0→duration removes that dead air. */
function computeLoopPoints(buffer: AudioBuffer): { start: number; end: number } {
  const SILENCE = 0.0015
  const data = buffer.getChannelData(0)
  const len = data.length
  let first = 0
  while (first < len && Math.abs(data[first]!) < SILENCE) first += 1
  let last = len - 1
  while (last > first && Math.abs(data[last]!) < SILENCE) last -= 1
  // All silence (or detection failed) → loop the whole buffer.
  if (last <= first) return { start: 0, end: buffer.duration }
  return { start: first / buffer.sampleRate, end: (last + 1) / buffer.sampleRate }
}

class SoundManager {
  private goalEl: HTMLAudioElement | null = null
  private cardEl: HTMLAudioElement | null = null
  private kickEl: HTMLAudioElement | null = null
  private missEl: HTMLAudioElement | null = null
  private goalFade: FadeChannel = { hold: null, fade: null }
  private missFade: FadeChannel = { hold: null, fade: null }
  private missTimer: ReturnType<typeof setTimeout> | null = null

  // Background loop runs through the Web Audio API: an AudioBufferSourceNode loops sample-accurately,
  // so the track repeats with no encoder-padding gap (which HTMLAudioElement.loop can't avoid).
  private audioCtx: AudioContext | null = null
  private bgBuffer: AudioBuffer | null = null
  private bgLoopStart = 0
  private bgLoopEnd = 0
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
    if (this.sfxMuted) {
      this.stopGoal()
      this.stopMiss()
    }
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

  private ensureKick(): HTMLAudioElement | null {
    if (!canUseAudio()) return null
    if (!this.kickEl) {
      this.kickEl = new Audio(`${SOUNDS_BASE}/ball_kick.m4a`)
      this.kickEl.preload = 'auto'
    }
    return this.kickEl
  }

  private ensureMiss(): HTMLAudioElement | null {
    if (!canUseAudio()) return null
    if (!this.missEl) {
      this.missEl = new Audio(`${SOUNDS_BASE}/missed_goal.m4a`)
      this.missEl.preload = 'auto'
    }
    return this.missEl
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
      const points = computeLoopPoints(this.bgBuffer)
      this.bgLoopStart = points.start
      this.bgLoopEnd = points.end
      return this.bgBuffer
    } catch {
      return null
    }
  }

  private clearFade(ch: FadeChannel): void {
    if (ch.hold) {
      clearTimeout(ch.hold)
      ch.hold = null
    }
    if (ch.fade) {
      clearInterval(ch.fade)
      ch.fade = null
    }
  }

  /** Hold `el` at `peak`, then ease its volume down to silence. The fade is exponential
   *  (multiplicative), so it decelerates and lingers through the low volumes the way the ear
   *  expects a sound to die away — a linear ramp instead drops in even steps and reads as a jump
   *  at the tail. The hold + fade are sized to the actual clip so the curve reaches silence right
   *  as the audio ends (a fixed fade longer than the file is what makes a clip cut off mid-fade).
   *  `holdFrac` caps the hold to a fraction of the clip so short clips still spend most of their
   *  length fading. */
  private holdThenFadeOut(
    el: HTMLAudioElement,
    peak: number,
    maxHoldMs: number,
    holdFrac: number,
    ch: FadeChannel,
  ): void {
    const clipMs =
      Number.isFinite(el.duration) && el.duration > 0 ? el.duration * 1000 : maxHoldMs + GOAL_FADE_MS
    const holdMs = Math.min(maxHoldMs, clipMs * holdFrac)
    const fadeMs = Math.max(300, clipMs - holdMs - 60)
    const steps = Math.max(1, Math.round(fadeMs / GOAL_FADE_TICK_MS))
    // Exponential decay from peak down to a near-silent floor; the jump from the floor to 0 is
    // inaudible (~ -40 dB), so the tail is smooth all the way out.
    const floor = Math.max(0.004, peak * 0.012)
    const factor = Math.pow(floor / peak, 1 / steps)
    ch.hold = setTimeout(() => {
      ch.hold = null
      ch.fade = setInterval(() => {
        const next = el.volume * factor
        if (next <= floor) {
          el.volume = 0
          try {
            el.pause()
          } catch {
            // ignore
          }
          this.clearFade(ch)
        } else {
          el.volume = next
        }
      }, GOAL_FADE_TICK_MS)
    }, holdMs)
  }

  // --- SFX ------------------------------------------------------------------

  /** Play the goal cue from the top at peak volume, then fade it out gradually to silence. */
  playGoal(): void {
    if (this.sfxMuted) return
    const el = this.ensureGoal()
    if (!el) return

    this.clearFade(this.goalFade)
    try {
      el.pause()
      el.currentTime = 0
      el.volume = GOAL_PEAK_VOLUME
      const playback = el.play()
      if (playback && typeof playback.catch === 'function') playback.catch(() => {})
    } catch {
      return
    }
    this.holdThenFadeOut(el, GOAL_PEAK_VOLUME, GOAL_HOLD_MS, 0.35, this.goalFade)
  }

  /** Missed-shot cue: the strike (ball_kick) immediately, then the groan (missed_goal) just after. */
  playMiss(): void {
    if (this.sfxMuted) return
    if (this.missTimer) {
      clearTimeout(this.missTimer)
      this.missTimer = null
    }
    this.clearFade(this.missFade)

    const kick = this.ensureKick()
    if (kick) {
      try {
        kick.pause()
        kick.currentTime = 0
        kick.volume = KICK_VOLUME
        const playback = kick.play()
        if (playback && typeof playback.catch === 'function') playback.catch(() => {})
      } catch {
        // ignore
      }
    }

    const gap =
      kick && Number.isFinite(kick.duration) && kick.duration > 0
        ? Math.min(kick.duration * 1000, 650)
        : MISS_GAP_FALLBACK_MS
    this.missTimer = setTimeout(() => {
      this.missTimer = null
      if (this.sfxMuted) return
      const miss = this.ensureMiss()
      if (!miss) return
      try {
        miss.pause()
        miss.currentTime = 0
        miss.volume = MISS_VOLUME
        const playback = miss.play()
        if (playback && typeof playback.catch === 'function') playback.catch(() => {})
      } catch {
        return
      }
      // Let the groan die away instead of stopping flat at the end of the clip.
      this.holdThenFadeOut(miss, MISS_VOLUME, MISS_HOLD_MS, 0.15, this.missFade)
    }, gap)
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
    this.clearFade(this.goalFade)
    const el = this.goalEl
    if (!el) return
    try {
      el.pause()
      el.currentTime = 0
    } catch {
      // ignore
    }
  }

  private stopMiss(): void {
    this.clearFade(this.missFade)
    if (this.missTimer) {
      clearTimeout(this.missTimer)
      this.missTimer = null
    }
    for (const el of [this.kickEl, this.missEl]) {
      if (!el) continue
      try {
        el.pause()
        el.currentTime = 0
      } catch {
        // ignore
      }
    }
  }

  // --- MUSIC (background loop, seamless via Web Audio) ----------------------

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
    // Loop the trimmed window (skipping head/tail silence) and begin playback at the trimmed start.
    source.loopStart = this.bgLoopStart
    source.loopEnd = this.bgLoopEnd
    source.playbackRate.value = BACKGROUND_RATE
    source.connect(gain).connect(ctx.destination)
    source.start(0, this.bgLoopStart)
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
