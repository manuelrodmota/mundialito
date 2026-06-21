import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CoachStep } from './steps'
import './coachMarks.css'

interface CoachMarksProps {
  steps: CoachStep[]
  /** Called when the player finishes the last step or skips the tour. */
  onDone: () => void
}

const PAD = 8 // spotlight padding around the target
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
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
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
      setRect(el ? el.getBoundingClientRect() : null)
    }
    raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step])

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

  const spotlightStyle: React.CSSProperties | undefined = hasTarget
    ? {
        top: rect!.top - PAD,
        left: rect!.left - PAD,
        width: rect!.width + PAD * 2,
        height: rect!.height + PAD * 2,
      }
    : undefined

  // Place the tooltip below the target if there's room, otherwise above.
  let popStyle: React.CSSProperties = {}
  let placeClass = 'centered'
  if (hasTarget) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const centerX = rect!.left + rect!.width / 2
    const left = Math.min(Math.max(centerX - POP_W / 2, MARGIN), vw - POP_W - MARGIN)
    const roomBelow = vh - rect!.bottom
    if (roomBelow > 220 || rect!.top < 220) {
      popStyle = { top: rect!.bottom + GAP, left }
      placeClass = 'place-below'
    } else {
      popStyle = { top: rect!.top - GAP, left }
      placeClass = 'place-above'
    }
  }

  return createPortal(
    <div
      className={`coach-veil${hasTarget ? '' : ' no-target'}`}
      onClick={advance}
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial"
    >
      {hasTarget && <div className="coach-spotlight" style={spotlightStyle} />}

      <div
        className={`coach-pop ${placeClass}`}
        style={popStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="coach-step">
          Step {i + 1} of {steps.length}
        </div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>

        <div className="coach-dots" aria-hidden>
          {steps.map((s, idx) => (
            <span key={s.target} className={idx === i ? 'on' : ''} />
          ))}
        </div>

        <div className="coach-actions">
          <button type="button" className="coach-skip" onClick={onDone}>
            Skip tour
          </button>
          <button type="button" className="coach-next" onClick={advance}>
            {last ? 'Got it' : 'Next →'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
