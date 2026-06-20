import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { popIn, fadeIn } from '../../motion'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/** Blurred-veil modal shell — pops on open, closes on veil click or Escape. */
export function Modal({ open, onClose, children }: ModalProps) {
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const handler = (e: Event) => {
      if ((e as globalThis.KeyboardEvent).key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const veilVariants = shouldReduceMotion ? undefined : fadeIn
  const cardVariants = shouldReduceMotion ? undefined : popIn

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-veil"
          variants={veilVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className="modal-card"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface OverlayProps {
  open: boolean
  children?: ReactNode
  /** Click-to-dismiss handler on the veil (e.g. the GOAL celebration). */
  onClick?: () => void
}

/** Full-bleed overlay veil for major moments (GOAL, result). */
export function Overlay({ open, children, onClick }: OverlayProps) {
  const shouldReduceMotion = useReducedMotion()
  const variants = shouldReduceMotion ? undefined : fadeIn

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overlay"
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClick}
          style={onClick ? { cursor: 'pointer' } : undefined}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
