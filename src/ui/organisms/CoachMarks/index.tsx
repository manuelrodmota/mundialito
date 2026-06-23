import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CoachStep } from './steps'
import { useLang } from '../../i18n'
import './coachMarks.css'

interface CoachMarksProps {
  steps: CoachStep[]
  /** Called when the player finishes the last step or skips the tour. */
  onDone: () => void
}

const PAD = 10 // spotlight padding around the target
const POP_W = 300
const GAP = 14 // gap between target and tooltip
const MARGIN = 12 // viewport edge margin

/**
 * Guided coach-mark tour: spotlights one DOM element at a time and floats a tooltip
 * beside it. Targets are resolved by CSS selector at render time (no ref threading),
 * re-measured on resize/scroll, and the whole thing is portaled to <body> so the
 * board's transforms/stacking contexts never clip it.
 *
 * The veil swallows pointer events (the board can't be touched mid-tour); clicking the
 * dimmed area advances, as do the explicit Next/Got it buttons. A missing target simply
 * centers the tooltip rather than breaking the flow.
 */
export function CoachMarks({ steps, onDone }: CoachMarksProps) {
  const { t } = useLang()
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [popH, setPopH] = useState(0)
  const step = steps[i]

  const advance = useCallback(() => {
    setI((prev) => {
      if (prev >= steps.length - 1) {
        onDone()
        return prev
      }
      return prev + 1
    })
  }, [steps.length, onDone])

  // Measure the current target after paint and keep it in sync with layout shifts.
  useLayoutEffect(() => {
    if (!step) return
    let raf = 0
    const measure = () => {
      const el = document.querySelector(step.target)
      if (!el) {
        setRect(null)
        return
      }
      // Expand the box to include any children that overflow their container — the fanned hand
      // cards are taller/wider than `.fan2`, so the container rect alone clips them. Framing the
      // visual union makes the spotlight hug what the player actually sees.
      const base = el.getBoundingClientRect()
      let { top, left, right, bottom } = base
      for (const child of Array.from(el.children)) {
        const cr = (child as HTMLElement).getBoundingClientRect()
        if (cr.width === 0 || cr.height === 0) continue
        top = Math.min(top, cr.top)
        left = Math.min(left, cr.left)
        right = Math.max(right, cr.right)
        bottom = Math.max(bottom, cr.bottom)
      }
      setRect(new DOMRect(left, top, right - left, bottom - top))
    }
    raf = requestAnimationFrame(measure)
    // Re-measure as the board settles (crest image load, fonts, the opponent-tactics row, etc.)
    // so the spotlight doesn't lock onto a pre-settle rect.
    const t1 = setTimeout(measure, 160)
    const t2 = setTimeout(measure, 440)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step])

  // Measure the tooltip's real height so placement can keep it (and its action
  // buttons) fully on screen. Runs before paint, so the corrected position is
  // what's painted — no flicker from the first-pass estimate.
  useLayoutEffect(() => {
    if (popRef.current) setPopH(popRef.current.offsetHeight)
  }, [i, rect])

  // Keyboard: Enter/→ advance, Esc skips.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone()
      else if (e.key === 'Enter' || e.key === 'ArrowRight') advance()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [advance, onDone])

  if (!step) return null

  const last = i === steps.length - 1
  const hasTarget = rect !== null && rect.width > 0 && rect.height > 0

  const vw = typeof window !== 'undefined' ? window.innerWidth : 0
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0

  // Clamp the spotlight box inside the viewport so its border is never cut off by
  // an edge (e.g. a target flush against the top, like the score meters in step 1).
  let spotlightStyle: React.CSSProperties | undefined
  if (hasTarget) {
    const sTop = Math.max(MARGIN, rect!.top - PAD)
    const sLeft = Math.max(MARGIN, rect!.left - PAD)
    const sBottom = Math.min(vh - MARGIN, rect!.bottom + PAD)
    const sRight = Math.min(vw - MARGIN, rect!.right + PAD)
    spotlightStyle = {
      top: sTop,
      left: sLeft,
      width: Math.max(0, sRight - sLeft),
      height: Math.max(0, sBottom - sTop),
    }
  }

  // Place the tooltip below the target if it fully fits, else above, else clamp it
  // into the viewport. Uses the measured height so the action buttons are never cut
  // off the bottom (the prior fixed 220px estimate overflowed for tall tooltips).
  let popStyle: React.CSSProperties = {}
  let placeClass = 'centered'
  if (hasTarget) {
    const h = popH || 260 // first-pass estimate; corrected before paint by the measure effect
    const centerX = rect!.left + rect!.width / 2
    const left = Math.min(Math.max(centerX - POP_W / 2, MARGIN), vw - POP_W - MARGIN)
    const belowTop = rect!.bottom + GAP
    const aboveTop = rect!.top - GAP - h
    let top: number
    if (belowTop + h <= vh - MARGIN) {
      top = belowTop
      placeClass = 'place-below'
    } else if (aboveTop >= MARGIN) {
      top = aboveTop
      placeClass = 'place-above'
    } else {
      // Neither side fully fits — favour the roomier side, then clamp below.
      top = vh - rect!.bottom >= rect!.top ? belowTop : aboveTop
      placeClass = 'place-below'
    }
    top = Math.min(Math.max(top, MARGIN), Math.max(MARGIN, vh - h - MARGIN))
    popStyle = { top, left }
  }

  return createPortal(
    <div
      className={`coach-veil${hasTarget ? '' : ' no-target'}`}
      onClick={advance}
      role="dialog"
      aria-modal="true"
      aria-label={t('match.coach.ariaTutorial')}
    >
      {hasTarget && <div className="coach-spotlight" style={spotlightStyle} />}

      <div
        ref={popRef}
        className={`coach-pop ${placeClass}`}
        style={popStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="coach-step">
          {t('match.coach.stepOf', { i: i + 1, n: steps.length })}
        </div>
        <h3>{t(step.title)}</h3>
        <p>{t(step.body)}</p>

        <div className="coach-dots" aria-hidden>
          {steps.map((s, idx) => (
            <span key={s.target} className={idx === i ? 'on' : ''} />
          ))}
        </div>

        <div className="coach-actions">
          <button type="button" className="coach-skip" onClick={onDone}>
            {t('match.coach.skip')}
          </button>
          <button type="button" className="coach-next" onClick={advance}>
            {last ? t('match.coach.gotIt') : t('match.coach.next')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
