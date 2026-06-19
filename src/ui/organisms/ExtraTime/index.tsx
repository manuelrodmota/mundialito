import { motion, useReducedMotion } from 'framer-motion'
import { fadeIn } from '../../motion'

/** Extra-time banner and board treatment — golden goal mode indicator. */
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
      GOLDEN GOAL
      <span className="et-sep">·</span>
      next goal wins
      <span className="et-sep">·</span>
      xG ×2
    </motion.div>
  )
}
