import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { ReactElement, ReactNode, CSSProperties } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { LaneFx } from '../../../engine/effectiveStats'

interface LaneProps {
  id: string
  kind: 'atk' | 'def'
  label: string
  children?: ReactNode
  lw?: number
  /** v10 lane-group balance indicators (from the engine's `laneFx`). `null` hides them. */
  fx?: LaneFx | null
  /** Number of cards staged in the lane — drives the measured packing. */
  count?: number
}

/** A droppable attack or defense lane — glows gold (`.droppable`) when a card hovers over it.
 * The DndContext is owned by the screen that uses this component.
 *
 * v10: surfaces the two balance levers as lane-group indicators — a "−N% stacked" pill +
 * amber zone (diminishing returns) and a "★ −N⚡ star core" pill + gold zone (stamina discount).
 * Packs a full lane into its measured height (`--ovl` overlap) plus a gentle horizontal fan so
 * it never spills off the pitch. The figures are computed engine-side so they can't drift from
 * resolution; this component only renders them.
 */
export function Lane({ id, kind, label, children, lw = 92, fx = null, count = 0 }: LaneProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const laneRef = useRef<HTMLDivElement | null>(null)
  const [pack, setPack] = useState<{ ovl: number | null; dx: number }>({ ovl: null, dx: 0 })

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      laneRef.current = node
      setNodeRef(node)
    },
    [setNodeRef],
  )

  const hasFx = !!fx
  useLayoutEffect(() => {
    const el = laneRef.current
    if (!el || count < 2) {
      setPack({ ovl: null, dx: 0 })
      return
    }
    const box = el.getBoundingClientRect()
    const cardH = lw * 1.42
    const reserveTop = hasFx ? 62 : 18 // room for the fx pills
    const reserveBot = 30 // room for the lane tag
    const avail = Math.max(cardH, box.height - reserveTop - reserveBot)
    const step = (avail - cardH) / (count - 1) // vertical advance per card
    let m = Math.min(step - cardH, -lw * 0.16) // gap when roomy, overlap when not
    m = Math.max(m, -(cardH * 0.84)) // keep ≥16% of each card visible
    const spareW = Math.max(0, box.width - lw - 10)
    const dx = Math.min(15, spareW / (count - 1)) // gentle centered fan across spare width
    setPack({ ovl: m, dx })
  }, [count, lw, hasFx])

  const grpCls = fx
    ? `${fx.lossPct >= 1 ? 'fx-stacked' : ''} ${fx.starcore ? 'fx-core' : ''}`.trim()
    : ''

  const fanned =
    pack.dx > 0
      ? Children.map(children, (child, i) => {
          if (!isValidElement(child)) return child
          const el = child as ReactElement<{ style?: CSSProperties }>
          const tx = (i - (count - 1) / 2) * pack.dx
          return cloneElement(el, {
            style: { ...(el.props.style ?? {}), transform: `translateX(${tx}px)` },
          })
        })
      : children

  return (
    <div
      ref={setRefs}
      className={`lane4 mine ${kind}-lane${isOver ? ' droppable' : ''}${grpCls ? ' ' + grpCls : ''}`}
      style={{ '--lw': lw + 'px' } as CSSProperties}
    >
      {fx && (
        <div className="lane-fx4">
          {fx.lossPct >= 1 && (
            <span
              className="fx-pill stack"
              title={`Diminishing returns — a lane's contributions are weighted high→low (×1.00 / 0.85 / 0.70 / 0.55 / 0.40 / 0.25). These ${count} cards together output ${100 - fx.lossPct}% of their raw stats. A few strong cards beat a wall.`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f0935a"
                strokeWidth="2.2"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="8.5" width="12" height="12.5" rx="2.2" />
                <rect x="9" y="3" width="12" height="12.5" rx="2.2" fill="rgba(40,18,8,0.92)" />
              </svg>
              −{fx.lossPct}% stacked
            </span>
          )}
          {fx.starcore && fx.saved > 0 && (
            <span
              className="fx-pill core"
              title={`Star core — a premium card anchors this lane, so every other card in it is half-price (min 1). You save ${fx.saved}⚡ this round.`}
            >
              ★ −{fx.saved}⚡ star core
            </span>
          )}
        </div>
      )}
      <div
        className={`lane4-cards${pack.ovl != null ? ' crowded' : ''}`}
        style={pack.ovl != null ? ({ '--ovl': pack.ovl + 'px' } as CSSProperties) : undefined}
      >
        {fanned}
      </div>
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
