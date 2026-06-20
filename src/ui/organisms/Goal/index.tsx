import { motion, useReducedMotion } from 'framer-motion'

interface GoalProps {
  isYou: boolean
  scorer?: string
  /** Scoreline after this goal, [you, them]. */
  score?: readonly [number, number]
}

const slam = {
  hidden: { scale: 0.4, opacity: 0 },
  visible: { scale: 1, opacity: 1 },
}
const sub = {
  hidden: { y: 14, opacity: 0 },
  visible: { y: 0, opacity: 1 },
}

/** GOAL blast — big italic gold/red wordmark + score subtitle over a dimmed pitch.
 * pointer-events:none so the surrounding Overlay veil receives click-to-dismiss.
 * Skips animation under prefers-reduced-motion. Styling lives in v9.css (.goal-blast).
 */
export function Goal({ isYou, scorer, score }: GoalProps) {
  const reduce = useReducedMotion()
  const title = isYou ? 'YOU SCORE' : scorer ? `${scorer.toUpperCase()} SCORES` : 'THEY SCORE'
  const line = score ? `${title} · ${score[0]} – ${score[1]}` : title

  return (
    <div className={`goal-blast ${isYou ? 'you' : 'them'}`}>
      <div className="gb-net" />
      <motion.div
        className="gb-text"
        variants={reduce ? undefined : slam}
        initial="hidden"
        animate="visible"
        transition={reduce ? undefined : { type: 'spring', stiffness: 320, damping: 18 }}
      >
        GOAL
      </motion.div>
      <motion.div
        className="gb-sub"
        variants={reduce ? undefined : sub}
        initial="hidden"
        animate="visible"
        transition={reduce ? undefined : { delay: 0.12, duration: 0.3 }}
      >
        {line}
      </motion.div>
    </div>
  )
}
