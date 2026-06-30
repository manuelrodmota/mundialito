import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  /** Accessible name for the control (and tooltip on the trigger). */
  ariaLabel?: string
  /** Extra classes on the trigger pill (e.g. an accent variant). */
  className?: string
  title?: string
}

/**
 * Custom dropdown that replaces native `<select>` — the native popup is unusable
 * on small / horizontally-scrolling layouts (it overflows the viewport and clips).
 *
 * The options panel is rendered with `position: fixed`, anchored to the trigger's
 * bounding rect, so it escapes any `overflow:hidden/auto` ancestor (the filter bar
 * scrolls horizontally on mobile). It closes on outside-click, Escape, scroll, and
 * resize, and supports arrow-key navigation.
 */
export function Select({ value, options, onChange, ariaLabel, className, title }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})

  const selected = options.find((o) => o.value === value)
  const selectedLabel = selected?.label ?? ''

  const position = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const gap = 6
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const openUp = below < 200 && above > below
    const maxHeight = Math.max(160, Math.min(340, openUp ? above : below))
    setPanelStyle({
      position: 'fixed',
      left: Math.max(8, r.left),
      minWidth: r.width,
      maxHeight,
      ...(openUp ? { bottom: window.innerHeight - r.top + gap } : { top: r.bottom + gap }),
    })
  }, [])

  function openMenu() {
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    position()

    const close = () => setOpen(false)
    const onDocPointer = (e: MouseEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false)
    }
    // `true` (capture) catches scrolls on any ancestor scroll container.
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    document.addEventListener('mousedown', onDocPointer)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      document.removeEventListener('mousedown', onDocPointer)
    }
  }, [open, position])

  // Keep the active option scrolled into view as it changes.
  useEffect(() => {
    if (!open) return
    const node = panelRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`)
    node?.scrollIntoView?.({ block: 'nearest' })
  }, [open, activeIndex])

  function choose(v: string) {
    onChange(v)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function onKeyDown(e: ReactKeyboardEvent) {
    if (e.key === 'Escape') {
      if (open) { e.preventDefault(); setOpen(false); triggerRef.current?.focus() }
      return
    }
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openMenu()
      }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(options.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setActiveIndex(0) }
    else if (e.key === 'End') { e.preventDefault(); setActiveIndex(options.length - 1) }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const opt = options[activeIndex]
      if (opt) choose(opt.value)
    }
  }

  return (
    <div className={`ui-select${open ? ' open' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`ui-select-trigger${className ? ' ' + className : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={title ?? ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className="ui-select-label">{selectedLabel}</span>
        <svg className="ui-select-chevron" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9 L12 15 L18 9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="ui-select-panel"
          role="listbox"
          aria-label={ariaLabel}
          style={panelStyle}
          tabIndex={-1}
          onKeyDown={onKeyDown}
        >
          {options.map((opt, i) => {
            const isSel = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSel}
                data-idx={i}
                className={`ui-select-option${isSel ? ' selected' : ''}${i === activeIndex ? ' active' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => choose(opt.value)}
              >
                <span className="ui-select-option-label">{opt.label}</span>
                {isSel && (
                  <svg className="ui-select-check" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12.5 L10 17.5 L19 6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </div>
  )
}
