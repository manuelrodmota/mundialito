import { useState, useRef, useEffect } from 'react'
import type { Formation } from '../../../engine/types'
import { useLang } from '../../i18n'

interface FormationOption {
  formation: Formation
  code: string
  labelKey: string
  description: string
}

// Stat multipliers stay as symbolic notation (ATK/DEF are kept abbreviations); only the
// shape label is translated, via labelKey.
const FORMATION_OPTIONS: FormationOption[] = [
  { formation: 'offensive', code: '4-3-3', labelKey: 'formation.offensive', description: 'ATK ×1.25 · DEF ×0.75' },
  { formation: 'balanced', code: '4-4-2', labelKey: 'formation.balanced', description: 'ATK ×1.0 · DEF ×1.0' },
  { formation: 'defensive', code: '5-4-1', labelKey: 'formation.defensive', description: 'ATK ×0.75 · DEF ×1.25' },
]

interface FormationMenuProps {
  selected: Formation
  onSelect: (formation: Formation) => void
}

/**
 * Compact formation control — a single button showing the current shape that opens a popover
 * with the three options. Keeps the corner small instead of pinning three wide buttons open.
 */
export function FormationMenu({ selected, onSelect }: FormationMenuProps) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = FORMATION_OPTIONS.find((o) => o.formation === selected) ?? FORMATION_OPTIONS[1]!

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="formation-menu" ref={ref}>
      <button
        type="button"
        className={`formation-menu-btn${open ? ' open' : ''}`}
        data-f={selected !== 'balanced' ? selected : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="fm-cap">{t('match.hud.shape')}</span>
        <b>{current.code}</b>
        <span className="fm-name">{t(current.labelKey)}</span>
        <svg className="fm-chev" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="formation-menu-pop formation-picker" role="menu">
          {FORMATION_OPTIONS.map(({ formation, code, labelKey, description }) => (
            <button
              key={formation}
              type="button"
              role="menuitemradio"
              aria-checked={selected === formation}
              className={selected === formation ? 'on' : ''}
              data-f={formation !== 'balanced' ? formation : undefined}
              onClick={() => {
                onSelect(formation)
                setOpen(false)
              }}
            >
              <b>{code}</b>
              <span>{t(labelKey)}</span>
              <i>{description}</i>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
