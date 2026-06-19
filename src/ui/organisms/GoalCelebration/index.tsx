import { useEffect, useRef } from 'react'
import { Overlay } from '../Modal'
import { Goal } from '../Goal'
import type { GoalEvent } from '../../quickplay/useQuickplayMatch'

interface GoalCelebrationProps {
  events: GoalEvent[]
  /** Called once the current celebration finishes, advancing to the next queued goal. */
  onDismiss: () => void
}

const CELEBRATION_DURATION_MS = 2200

/**
 * Renders the current goal event full-screen and auto-advances after a delay.
 * Same-round double goals are pre-queued in the events array — each event
 * plays sequentially. SFX hook point: replace the empty onSfx callback
 * when audio assets are shipped.
 */
export function GoalCelebration({ events, onDismiss }: GoalCelebrationProps) {
  const currentEvent = events[0]
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!currentEvent) return

    timerRef.current = setTimeout(() => {
      onDismiss()
    }, CELEBRATION_DURATION_MS)

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [currentEvent, onDismiss])

  const isOpen = currentEvent !== undefined

  return (
    <Overlay open={isOpen}>
      {currentEvent && (
        <Goal scorer={currentEvent.isYou ? undefined : currentEvent.scorer} />
      )}
    </Overlay>
  )
}
