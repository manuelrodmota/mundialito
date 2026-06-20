import type { Formation } from '../../../engine/types'

interface FormationOption {
  formation: Formation
  code: string
  label: string
  description: string
}

const FORMATION_OPTIONS: FormationOption[] = [
  { formation: 'balanced', code: '4-4-2', label: 'Balanced', description: 'ATK ×1.0 · DEF ×1.0' },
  { formation: 'offensive', code: '4-3-3', label: 'Offensive', description: 'ATK ×1.25 · DEF ×0.75' },
  { formation: 'defensive', code: '5-4-1', label: 'Defensive', description: 'ATK ×0.75 · DEF ×1.25' },
]

interface FormationPickerProps {
  selected: Formation
  onSelect: (formation: Formation) => void
}

/** Formation picker — balanced / offensive / defensive with `data-f` tint on selected. */
export function FormationPicker({ selected, onSelect }: FormationPickerProps) {
  return (
    <div className="formation-picker">
      <span className="fp-label">Shape</span>
      {FORMATION_OPTIONS.map(({ formation, code, label, description }) => (
        <button
          key={formation}
          type="button"
          className={selected === formation ? 'on' : ''}
          data-f={formation !== 'balanced' ? formation : undefined}
          onClick={() => onSelect(formation)}
        >
          <b>{code}</b>
          <span>{label}</span>
          <i>{description}</i>
        </button>
      ))}
    </div>
  )
}
