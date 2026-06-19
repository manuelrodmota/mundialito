/** Motion token constants mirroring the CSS token values for use in Framer Motion variants.
 * Mirrors the values from src/ui/tokens/tokens.css.
 */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const
export const EASE_IN_OUT = [0.4, 0, 0.2, 1] as const
export const EASE_SPRING = [0.2, 0.8, 0.3, 1] as const

export const DUR_MICRO = 0.12
export const DUR_FAST = 0.16
export const DUR_BASE = 0.22
export const DUR_SLOW = 0.42
export const DUR_REVEAL = 0.52

/** Standard pop-in variant — use for modals, cards entering the screen. */
export const popIn = {
  hidden: { opacity: 0, scale: 0.92, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DUR_BASE, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 8,
    transition: { duration: DUR_FAST, ease: EASE_IN_OUT },
  },
}

/** Fade-in variant for veils and overlays. */
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR_BASE, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: DUR_FAST, ease: EASE_IN_OUT } },
}

/** Radial blast variant for the GOAL animation — skips when reduced-motion is preferred. */
export const goalBlast = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DUR_SLOW, ease: EASE_SPRING },
  },
  exit: { opacity: 0, transition: { duration: DUR_FAST } },
}
