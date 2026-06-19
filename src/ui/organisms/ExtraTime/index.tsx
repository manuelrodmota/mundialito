import { motion, useReducedMotion } from 'framer-motion'
import { fadeIn } from '../../motion'

/** Extra-time banner and board treatment — v10 sudden-death golden goal indicator. */
export function ExtraTimeBanner() {
  const shouldReduceMotion = useReducedMotion()

  const variants = shouldReduceMotion ? undefined : fadeIn

  return (
    <motion.div
      className="et-banner7"
      style={{ position: 'static', transform: 'none' }}
      variants={variants}
      initial="hidden"
      animate="visible"
    >
      <span className="et-dot" />
      <b>EXTRA TIME</b>
      <span className="et-sep">·</span>
      SUDDEN DEATH
      <span className="et-sep">·</span>
      only the bigger chance counts
      <span className="et-sep">·</span>
      xG ×2
    </motion.div>
  )
}
