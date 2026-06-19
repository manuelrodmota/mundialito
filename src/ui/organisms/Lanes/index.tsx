import type { ReactNode, CSSProperties } from 'react'
import { useDroppable } from '@dnd-kit/core'

interface LaneProps {
  id: string
  kind: 'atk' | 'def'
  label: string
  children?: ReactNode
  lw?: number
}

/** A droppable attack or defense lane — glows gold (`.droppable`) when a card hovers over it.
 * The DndContext is owned by the screen that uses this component.
 */
export function Lane({ id, kind, label, children, lw = 92 }: LaneProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`lane4 mine ${kind}-lane${isOver ? ' droppable' : ''}`}
      style={{ '--lw': lw + 'px' } as CSSProperties}
    >
      <div className="lane4-cards">{children}</div>
      <div className="ltag4">{label}</div>
    </div>
  )
}

interface ClashBadgeProps {
  atk: number
  def: number
  diff?: number
}

/** Clash badge showing ATK vs DEF totals and surplus. */
export function ClashBadge({ atk, def, diff }: ClashBadgeProps) {
  return (
    <div className="clash4" style={{ position: 'static', transform: 'none' }}>
      <div className="row4">
        <span className="num atk">{atk}</span>
        <span className="x">VS</span>
        <span className="num def">{def}</span>
      </div>
      {diff !== undefined && (
        <span className="res dmg">+{diff} on goal</span>
      )}
    </div>
  )
}

interface DmgFloatProps {
  value: number | 'HELD'
}

/** Floating damage/xG feedback number. */
export function DmgFloat({ value }: DmgFloatProps) {
  const isHeld = value === 'HELD'
  return (
    <span className={`dmg-float${isHeld ? ' zero' : ''}`} style={{ position: 'static' }}>
      {isHeld ? 'HELD' : value}
    </span>
  )
}

interface XGFloatProps {
  amount: number
  label?: string
}

/** Floating xG gain annotation. */
export function XGFloat({ amount, label = 'xG · clear chance' }: XGFloatProps) {
  return (
    <div className="xg-float4" style={{ position: 'static' }}>
      <span className="amt">+{amount.toFixed(2)}</span>
      <span className="pt">{label}</span>
    </div>
  )
}
