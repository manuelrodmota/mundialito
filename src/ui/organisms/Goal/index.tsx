import { motion, useReducedMotion } from 'framer-motion'
import { goalBlast, DUR_SLOW, EASE_SPRING } from '../../motion'

interface GoalProps {
  scorer?: string
}

/** GOAL blast — radial explosion with net background and gold text.
 * Skips animation when prefers-reduced-motion is set.
 */
export function Goal({ scorer }: GoalProps) {
  const shouldReduceMotion = useReducedMotion()
  const variants = shouldReduceMotion ? undefined : goalBlast

  return (
    <motion.div
      className="goal-blast"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 200,
        borderRadius: 12,
        overflow: 'hidden',
        background: 'radial-gradient(80% 60% at 50% 50%, rgba(10,13,21,.75), rgba(10,13,21,.92))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={
        shouldReduceMotion
          ? undefined
          : { duration: DUR_SLOW, ease: EASE_SPRING }
      }
    >
      <div
        className="gb-net"
        style={{ position: 'absolute', inset: 0, opacity: 0.14 }}
      />
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          fontStyle: 'italic',
          color: '#e8c873',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          position: 'relative',
          zIndex: 1,
        }}
      >
        GOAL!
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.3em',
          color: 'rgba(255,255,255,.85)',
          marginTop: 8,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {scorer ? scorer.toUpperCase() + ' SCORES' : 'YOU SCORE'}
      </div>
    </motion.div>
  )
}
