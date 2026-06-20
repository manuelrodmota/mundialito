import { useCallback, useEffect, useRef } from 'react'
import { Overlay } from '../Modal'
import { Goal } from '../Goal'
import type { GoalEvent } from '../../quickplay/useQuickplayMatch'

interface GoalCelebrationProps {
  events: GoalEvent[]
  /** Called once the current celebration finishes, advancing to the next queued goal. */
  onDismiss: () => void
}

const CELEBRATION_DURATION_MS = 1600

/**
 * Renders the current goal event full-screen and auto-advances after a delay, or on click.
 * Same-round double goals are pre-queued in the events array — each event plays sequentially.
 */
export function GoalCelebration({ events, onDismiss }: GoalCelebrationProps) {
  const currentEvent = events[0]
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    onDismiss()
  }, [onDismiss])

  useEffect(() => {
    if (!currentEvent) return
    timerRef.current = setTimeout(() => {
      onDismiss()
    }, CELEBRATION_DURATION_MS)
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [currentEvent, onDismiss])

  return (
    <Overlay open={currentEvent !== undefined} onClick={currentEvent ? dismiss : undefined}>
      {currentEvent && (
        <Goal
          isYou={currentEvent.isYou}
          scorer={currentEvent.isYou ? undefined : currentEvent.scorer}
          score={currentEvent.score}
        />
      )}
    </Overlay>
  )
}
