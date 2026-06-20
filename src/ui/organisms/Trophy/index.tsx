import { motion, useReducedMotion } from 'framer-motion'

interface TrophyProps {
  /** Optional label shown beneath the trophy (e.g. champion nation or run year). */
  label?: string
}

const lift = {
  hidden: { y: 40, opacity: 0, scale: 0.7 },
  visible: { y: 0, opacity: 1, scale: 1 },
}

const shine = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

/** Champion-lift moment — animated trophy raise with a reduced-motion static fallback.
 * Presentational only; import type from engine if needed, no runtime imports.
 */
export function Trophy({ label }: TrophyProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="trophy-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <motion.div
        className="trophy-cup-wrap"
        variants={shouldReduceMotion ? undefined : lift}
        initial={shouldReduceMotion ? undefined : 'hidden'}
        animate={shouldReduceMotion ? undefined : 'visible'}
        transition={shouldReduceMotion ? undefined : { type: 'spring', stiffness: 220, damping: 18, delay: 0.05 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <motion.div
          variants={shouldReduceMotion ? undefined : shine}
          initial={shouldReduceMotion ? undefined : 'hidden'}
          animate={shouldReduceMotion ? undefined : 'visible'}
          transition={shouldReduceMotion ? undefined : { delay: 0.45, duration: 0.5 }}
        >
          <svg
            className="trophy-cup"
            viewBox="0 0 130 130"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Cup body */}
            <path
              d="M44 20 H86 V55 C86 75 72 88 65 92 C58 88 44 75 44 55 Z"
              fill="url(#gold-cup)"
              stroke="rgba(232,200,115,0.4)"
              strokeWidth="1.5"
            />
            {/* Handles */}
            <path d="M44 30 Q28 30 28 48 Q28 60 44 60" stroke="url(#gold-handle)" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M86 30 Q102 30 102 48 Q102 60 86 60" stroke="url(#gold-handle)" strokeWidth="5" fill="none" strokeLinecap="round" />
            {/* Stem */}
            <rect x="60" y="92" width="10" height="14" rx="2" fill="url(#gold-stem)" />
            {/* Base */}
            <rect x="48" y="106" width="34" height="8" rx="4" fill="url(#gold-base)" />
            {/* Star */}
            <path
              d="M65 35 L67.4 42.6 H75.5 L69.1 47.1 L71.5 54.7 L65 50.2 L58.5 54.7 L60.9 47.1 L54.5 42.6 H62.6 Z"
              fill="rgba(255,255,255,0.85)"
            />
            <defs>
              <linearGradient id="gold-cup" x1="44" y1="20" x2="86" y2="92" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffe97a" />
                <stop offset="50%" stopColor="#e8c873" />
                <stop offset="100%" stopColor="#c49a2a" />
              </linearGradient>
              <linearGradient id="gold-handle" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
                <stop offset="0%" stopColor="#ffe97a" />
                <stop offset="100%" stopColor="#c49a2a" />
              </linearGradient>
              <linearGradient id="gold-stem" x1="60" y1="92" x2="70" y2="106" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#e8c873" />
                <stop offset="100%" stopColor="#c49a2a" />
              </linearGradient>
              <linearGradient id="gold-base" x1="48" y1="106" x2="82" y2="114" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffe97a" />
                <stop offset="100%" stopColor="#c49a2a" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      </motion.div>

      {label && (
        <motion.div
          className="mvp-tag"
          variants={shouldReduceMotion ? undefined : shine}
          initial={shouldReduceMotion ? undefined : 'hidden'}
          animate={shouldReduceMotion ? undefined : 'visible'}
          transition={shouldReduceMotion ? undefined : { delay: 0.6, duration: 0.4 }}
          style={{ letterSpacing: '0.2em', fontSize: 13 }}
        >
          {label}
        </motion.div>
      )}
    </div>
  )
}
