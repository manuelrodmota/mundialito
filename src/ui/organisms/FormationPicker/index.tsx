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

interface FormationPickerProps {
  selected: Formation
  onSelect: (formation: Formation) => void
}

/** Formation picker — balanced / offensive / defensive with `data-f` tint on selected. */
export function FormationPicker({ selected, onSelect }: FormationPickerProps) {
  const { t } = useLang()
  return (
    <div className="formation-picker">
      <span className="fp-label">{t('formation.shape')}</span>
      {FORMATION_OPTIONS.map(({ formation, code, labelKey, description }) => (
        <button
          key={formation}
          type="button"
          className={selected === formation ? 'on' : ''}
          data-f={formation !== 'balanced' ? formation : undefined}
          onClick={() => onSelect(formation)}
        >
          <b>{code}</b>
          <span>{t(labelKey)}</span>
          <i>{description}</i>
        </button>
      ))}
    </div>
  )
}
